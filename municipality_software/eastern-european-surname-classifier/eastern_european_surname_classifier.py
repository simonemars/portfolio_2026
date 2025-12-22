"""
Eastern European Surname Classifier (ASCII-normalized)

This script implements a binary classifier to determine whether a surname is Eastern European
based on ASCII-normalized linguistic features. It uses a Random Forest model trained on surnames from
Croatia, Slovenia, Serbia, Bosnia-Herzegovina, and Montenegro.

Author: Surname Classifier
Date: 2024
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score, accuracy_score, precision_score, recall_score, classification_report
from sklearn.feature_extraction.text import CountVectorizer
import pickle
import unicodedata
import re
from typing import Tuple, List
import warnings
warnings.filterwarnings('ignore')

def to_ascii(s: str) -> str:
    """Normalize a string to ASCII (strip diacritics)."""
    return unicodedata.normalize('NFKD', s).encode('ASCII','ignore').decode('ASCII')

def soundex(name: str) -> str:
    """
    Simple Soundex implementation for phonetic encoding.
    Returns a 4-character code.
    """
    name = name.upper()
    if not name:
        return "0000"
    first_letter = name[0]
    # Soundex mappings
    mappings = {
        'BFPV': '1', 'CGJKQSXZ': '2', 'DT': '3', 'L': '4', 'MN': '5', 'R': '6'
    }
    def map_char(c):
        for key, val in mappings.items():
            if c in key:
                return val
        return ''
    # Remove non-alpha
    name = re.sub(r'[^A-Z]', '', name)
    # Map chars
    digits = [map_char(c) for c in name[1:]]
    # Remove consecutive duplicates
    filtered = []
    prev = ''
    for d in digits:
        if d != prev:
            filtered.append(d)
            prev = d
    # Remove '0's and join
    code = first_letter + ''.join(filtered)
    code = code.replace('0', '')
    return (code + '000')[:4]

class EasternEuropeanSurnameClassifier:
    """
    A classifier for determining whether surnames are Eastern European.
    Uses only ASCII-normalized features for real-world robustness.
    """
    
    def __init__(self, threshold: float = 0.30):
        self.threshold = threshold
        self.model = None
        self.feature_pipeline = None
        self.is_trained = False
    
    def extract_features(self, surname_ascii: str) -> dict:
        """
        Extract features from an ASCII-normalized surname.
        Args:
            surname_ascii (str): The ASCII-normalized surname
        Returns:
            dict: Extracted features
        """
        surname_ascii = surname_ascii.lower()
        features = {
            'surname_ascii': surname_ascii,
            'length': len(surname_ascii),
            'vowel_count': sum(1 for char in surname_ascii if char in 'aeiou'),
            'first_letter': surname_ascii[0] if surname_ascii else '',
            'last_letter': surname_ascii[-1] if surname_ascii else '',
            'soundex': soundex(surname_ascii)
        }
        return features
    
    def create_character_ngrams(self, surname_ascii: str, n: int = 2) -> List[str]:
        if len(surname_ascii) < n:
            return []
        return [surname_ascii[i:i+n] for i in range(len(surname_ascii) - n + 1)]
    
    def prepare_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare the dataset for training by normalizing surnames and creating features.
        """
        # Normalize surnames to ASCII
        df['surname_ascii'] = df['surname'].apply(to_ascii)
        # Drop diacritic_count if present
        if 'diacritic_count' in df.columns:
            df = df.drop(columns=['diacritic_count'])
        # Create binary target
        df['is_eastern_european'] = (df['country_code'].isin([0, 1, 2, 3, 4])).astype(int)
        # Feature engineering on ASCII
        df['length'] = df['surname_ascii'].apply(len)
        df['vowel_count'] = df['surname_ascii'].apply(lambda x: sum(1 for c in x if c in 'aeiou'))
        df['first_letter'] = df['surname_ascii'].apply(lambda x: x[0] if x else '')
        df['last_letter'] = df['surname_ascii'].apply(lambda x: x[-1] if x else '')
        df['soundex'] = df['surname_ascii'].apply(soundex)
        df['bigrams'] = df['surname_ascii'].apply(lambda x: ' '.join(self.create_character_ngrams(x, 2)))
        df['trigrams'] = df['surname_ascii'].apply(lambda x: ' '.join(self.create_character_ngrams(x, 3)))
        return df
    
    def build_feature_pipeline(self) -> Pipeline:
        numeric_features = ['length', 'vowel_count']
        categorical_features = ['first_letter', 'last_letter', 'soundex']
        text_features = ['bigrams', 'trigrams']
        numeric_transformer = StandardScaler()
        categorical_transformer = OneHotEncoder(drop='first', sparse_output=False, handle_unknown='ignore')
        text_transformer = CountVectorizer(max_features=100, min_df=2)
        preprocessor = ColumnTransformer([
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features),
            ('bigrams', text_transformer, 'bigrams'),
            ('trigrams', text_transformer, 'trigrams')
        ], remainder='drop')
        return preprocessor
    
    def train(self, data_path: str, test_size: float = 0.2, random_state: int = 42):
        print("Loading and preparing data...")
        df = pd.read_csv(data_path)
        df = self.prepare_data(df)
        X = df[['surname_ascii', 'length', 'vowel_count', 'first_letter', 'last_letter', 'soundex', 'bigrams', 'trigrams']]
        y = df['is_eastern_european']
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )
        print(f"Training set size: {len(X_train)}")
        print(f"Test set size: {len(X_test)}")
        print(f"Eastern European surnames in training set: {y_train.sum()}/{len(y_train)} ({y_train.mean():.1%})")
        self.feature_pipeline = self.build_feature_pipeline()
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=random_state,
            n_jobs=-1
        )
        full_pipeline = Pipeline([
            ('preprocessor', self.feature_pipeline),
            ('classifier', self.model)
        ])
        print("Training model...")
        full_pipeline.fit(X_train, y_train)
        self.model = full_pipeline
        self.is_trained = True
        print("\nEvaluating model...")
        self.evaluate(X_test, y_test)
        return X_test, y_test
    
    def evaluate(self, X_test: pd.DataFrame, y_test: pd.Series):
        if not self.is_trained:
            raise ValueError("Model must be trained before evaluation")
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]
        y_pred = (y_pred_proba >= self.threshold).astype(int)
        roc_auc = roc_auc_score(y_test, y_pred_proba)
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        print(f"ROC-AUC: {roc_auc:.3f}")
        print(f"Accuracy: {accuracy:.3f}")
        print(f"Precision: {precision:.3f}")
        print(f"Recall: {recall:.3f}")
        print(f"Threshold: {self.threshold}")
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=['Non-Eastern European', 'Eastern European']))
        print("\nExample predictions:")
        sample_indices = np.random.choice(len(X_test), min(10, len(X_test)), replace=False)
        for idx in sample_indices:
            surname = X_test.iloc[idx]['surname_ascii']
            true_label = y_test.iloc[idx]
            prob = y_pred_proba[idx]
            pred_label = y_pred[idx]
            print(f"  {surname}: True={true_label}, Prob={prob:.3f}, Pred={pred_label}")
    
    def predict_eastern_european(self, name: str) -> Tuple[float, bool]:
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        name_ascii = to_ascii(name)
        features = self.extract_features(name_ascii)
        df_single = pd.DataFrame([features])
        df_single['bigrams'] = df_single['surname_ascii'].apply(lambda x: ' '.join(self.create_character_ngrams(x, 2)))
        df_single['trigrams'] = df_single['surname_ascii'].apply(lambda x: ' '.join(self.create_character_ngrams(x, 3)))
        prob = self.model.predict_proba(df_single)[0, 1]
        is_eastern_european = prob >= self.threshold
        return prob, is_eastern_european
    
    def save_model(self, filepath: str):
        if not self.is_trained:
            raise ValueError("Model must be trained before saving")
        with open(filepath, 'wb') as f:
            pickle.dump(self.model, f)
        print(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        with open(filepath, 'rb') as f:
            self.model = pickle.load(f)
        self.is_trained = True
        print(f"Model loaded from {filepath}")


def main():
    classifier = EasternEuropeanSurnameClassifier(threshold=0.30)
    data_path = "names_files/binary_surnames_dataset.csv"
    X_test, y_test = classifier.train(data_path)
    classifier.save_model("eastern_european_surname_model.pkl")
    test_names = [
        "Kovačević", "Novak", "Jovanović", "Smith", "Garcia", "Müller", "Kowalski", "Ivanov", "Nagy", "Popović"
    ]
    print("\n" + "="*50)
    print("PREDICTION EXAMPLES")
    print("="*50)
    for name in test_names:
        prob, is_eastern_european = classifier.predict_eastern_european(name)
        status = "EASTERN EUROPEAN" if is_eastern_european else "NOT Eastern European"
        print(f"{name:15} -> {prob:.3f} -> {status}")
    print("\n" + "="*50)
    print("REUSABLE FUNCTION DEMONSTRATION")
    print("="*50)
    def predict_eastern_european(name: str) -> Tuple[float, bool]:
        return classifier.predict_eastern_european(name)
    test_surname = "Petrović"
    probability, is_eastern_european = predict_eastern_european(test_surname)
    print(f"Function test: {test_surname} -> ({probability:.3f}, {is_eastern_european})")

if __name__ == "__main__":
    main() 