import pandas as pd
import numpy as np
from sklearn.ensemble import VotingClassifier, RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.model_selection import train_test_split, TimeSeriesSplit, GridSearchCV
from sklearn.metrics import accuracy_score, roc_auc_score, confusion_matrix, classification_report
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
import joblib
import warnings
warnings.filterwarnings('ignore')

class MatchPredictor:
    def __init__(self):
        self.elo_ratings = None
        self.scaler = StandardScaler()
        self.surface_encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
        self.model = None
        self.feature_columns = None
        self.player_db = None
        
        # Load Elo ratings first
        self.load_elo_ratings('final_elo_ratings_all_years.csv')
        
        # Load player database
        try:
            self.player_db = pd.read_csv('player_database.csv')
        except:
            print("Warning: Could not load player database. Some features may be unavailable.")
        
        # Try to load existing model
        try:
            self.load_model()
        except:
            # If model doesn't exist, train and save it
            self.train_model()
            self.save_model()
        
    def load_elo_ratings(self, elo_file):
        """Load the pre-calculated Elo ratings"""
        self.elo_ratings = pd.read_csv(elo_file)
        self.elo_ratings.set_index('player_id', inplace=True)
    
    def prepare_features(self, matches_df, fit_encoder=False):
        """Prepare features for prediction"""
        features_list = []
        
        # One-hot encode surface
        if fit_encoder:
            surface_encoded = self.surface_encoder.fit_transform(matches_df[['surface']])
        else:
            surface_encoded = self.surface_encoder.transform(matches_df[['surface']])
        surface_df = pd.DataFrame(surface_encoded, 
                                columns=[f'surface_{cat}' for cat in self.surface_encoder.categories_[0]],
                                index=matches_df.index)
        features_list.append(surface_df)
        
        # Add Elo ratings
        features_list.append(pd.DataFrame({
            'player1_elo': matches_df.apply(
                lambda x: self.elo_ratings.loc[x['player1_id'], x['surface']] 
                if x['player1_id'] in self.elo_ratings.index else 1000, axis=1),
            'player2_elo': matches_df.apply(
                lambda x: self.elo_ratings.loc[x['player2_id'], x['surface']] 
                if x['player2_id'] in self.elo_ratings.index else 1000, axis=1)
        }, index=matches_df.index))
        
        # Add player statistics for both players
        for player_num in [1, 2]:
            player_id_col = f'player{player_num}_id'
            player_data = matches_df[player_id_col].map(
                lambda x: self.player_db[self.player_db['player_id'] == x].iloc[0] if len(self.player_db[self.player_db['player_id'] == x]) > 0 else None
            )
            
            # Height
            features_list.append(pd.DataFrame({
                f'height_{player_num}': player_data.map(lambda x: x['height'] if x is not None and not pd.isna(x['height']) else 0)
            }, index=matches_df.index))
            
            # Weight
            features_list.append(pd.DataFrame({
                f'weight_{player_num}': player_data.map(lambda x: x['weight'] if x is not None and not pd.isna(x['weight']) else 0)
            }, index=matches_df.index))
            
            # Playing style (one-hot encode)
            plays = player_data.map(lambda x: x['plays'] if x is not None and not pd.isna(x['plays']) else 'unknown')
            plays_dummies = pd.get_dummies(plays, prefix=f'plays_{player_num}')
            plays_dummies = plays_dummies.reindex(matches_df.index, fill_value=0)
            features_list.append(plays_dummies)
        
        # Combine all features
        features = pd.concat(features_list, axis=1)
        
        # Add height/weight difference
        features['height_diff'] = features['height_1'] - features['height_2']
        features['weight_diff'] = features['weight_1'] - features['weight_2']
        
        # Add Elo difference
        features['elo_diff'] = features['player1_elo'] - features['player2_elo']
        
        # Scale numerical features
        numerical_features = ['player1_elo', 'player2_elo', 'height_1', 'height_2', 'weight_1', 'weight_2', 'height_diff', 'weight_diff', 'elo_diff']
        if fit_encoder:
            features[numerical_features] = self.scaler.fit_transform(features[numerical_features])
        else:
            features[numerical_features] = self.scaler.transform(features[numerical_features])
        
        # Ensure feature columns match those used during training
        if not fit_encoder and self.feature_columns is not None:
            for col in self.feature_columns:
                if col not in features.columns:
                    features[col] = 0
            features = features[self.feature_columns]
        
        return features
    
    def prepare_target(self, df):
        """Prepare target variable (1 for winner, 0 for loser)"""
        return np.ones(len(df))  # All rows in training data are winners
    
    def build_model(self):
        """Build the ensemble model"""
        # Create base models
        elo_tree = DecisionTreeClassifier(
            max_depth=5,
            min_samples_leaf=50,
            random_state=42
        )
        
        stats_tree = DecisionTreeClassifier(
            max_depth=5,
            min_samples_leaf=50,
            random_state=42
        )
        
        full_tree = DecisionTreeClassifier(
            max_depth=5,
            min_samples_leaf=50,
            random_state=42
        )
        
        # Create the ensemble
        self.model = VotingClassifier(
            estimators=[
                ('elo', elo_tree),
                ('stats', stats_tree),
                ('full', full_tree)
            ],
            voting='soft'
        )
    
    def train(self, df, test_size=0.2):
        """Train the model"""
        # Prepare features and target
        X = self.prepare_features(df)
        y = self.build_target(df)
        
        # Split data chronologically
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, shuffle=False
        )
        
        # Create preprocessing pipeline
        numeric_features = ['elo_diff', 'surface_win_rate_diff', 'career_win_rate_diff']
        categorical_features = ['surface']
        
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', StandardScaler(), numeric_features),
                ('cat', OneHotEncoder(sparse=False, handle_unknown='ignore'), categorical_features)
            ]
        )
        
        # Build and train the model
        self.build_model()
        pipeline = Pipeline([
            ('preprocessor', preprocessor),
            ('classifier', self.model)
        ])
        
        # Train the model
        pipeline.fit(X_train, y_train)
        
        # Evaluate on test set
        y_pred = pipeline.predict(X_test)
        y_pred_proba = pipeline.predict_proba(X_test)[:, 1]
        
        print("\nModel Performance:")
        print(f"Accuracy: {accuracy_score(y_test, y_pred):.3f}")
        print(f"ROC-AUC: {roc_auc_score(y_test, y_pred_proba):.3f}")
        print("\nConfusion Matrix:")
        print(confusion_matrix(y_test, y_pred))
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred))
        
        # Save the model
        joblib.dump(pipeline, 'match_predictor.joblib')
        
        return pipeline
    
    def prepare_training_data(self, match_data):
        """Prepare training data with both winner and loser perspectives"""
        # Create winner perspective (label = 1)
        winner_data = match_data.copy()
        winner_data['player1_id'] = match_data['winner_id']
        winner_data['player2_id'] = match_data['loser_id']
        winner_data['label'] = 1
        
        # Create loser perspective (label = 0)
        loser_data = match_data.copy()
        loser_data['player1_id'] = match_data['loser_id']
        loser_data['player2_id'] = match_data['winner_id']
        loser_data['label'] = 0
        
        # Combine both perspectives
        training_data = pd.concat([winner_data, loser_data], ignore_index=True)
        return training_data

    def train_model(self):
        """Train the model using historical data"""
        print("Training new model...")
        
        # Load historical match data
        match_data = pd.read_csv('TML-Database-master/2023.csv')  # Using 2023 data for training
        
        # Drop rows with missing values
        match_data = match_data.dropna(subset=['winner_id', 'loser_id', 'surface'])
        
        # Prepare training data with both perspectives
        training_data = self.prepare_training_data(match_data)
        
        # Fit the surface encoder on all possible surfaces
        all_surfaces = np.array([['Hard'], ['Clay'], ['Grass'], ['Carpet']])
        self.surface_encoder.fit(all_surfaces)
        
        # Prepare features
        X = self.prepare_features(training_data, fit_encoder=True)
        y = training_data['label']
        
        # Split data into train and validation sets
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train Random Forest model
        self.model = RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        
        # Fit the model
        self.model.fit(X_train, y_train)
        
        # Evaluate on validation set
        val_predictions = self.model.predict(X_val)
        val_probabilities = self.model.predict_proba(X_val)[:, 1]
        
        print("\nModel Performance:")
        print(f"Accuracy: {accuracy_score(y_val, val_predictions):.3f}")
        print(f"ROC-AUC: {roc_auc_score(y_val, val_probabilities):.3f}")
        print("\nFeature Importance:")
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)
        print(feature_importance.head(10))
        
        # Save feature columns
        self.feature_columns = X.columns.tolist()
        
        # Save the model
        self.save_model()

    def save_model(self):
        """Save the trained model and feature columns"""
        joblib.dump({
            'model': self.model,
            'feature_columns': self.feature_columns,
            'scaler': self.scaler,
            'surface_encoder': self.surface_encoder
        }, 'match_predictor.joblib')

    def load_model(self):
        """Load the trained model and feature columns"""
        saved_data = joblib.load('match_predictor.joblib')
        self.model = saved_data['model']
        self.feature_columns = saved_data['feature_columns']
        self.scaler = saved_data['scaler']
        self.surface_encoder = saved_data['surface_encoder']

    def predict_matches(self, matches_df):
        """Predict winners for new matches using mirrored predictions for fairness"""
        # Create original and reversed versions of each match
        original_matches = matches_df.copy()
        reversed_matches = matches_df.copy()
        reversed_matches['player1_id'] = matches_df['player2_id']
        reversed_matches['player2_id'] = matches_df['player1_id']
        
        # Prepare features for both versions
        X_original = self.prepare_features(original_matches, fit_encoder=False)
        X_reversed = self.prepare_features(reversed_matches, fit_encoder=False)
        
        # Get probabilities for both versions
        prob_original = self.model.predict_proba(X_original)[:, 1]  # P(player1 wins in original)
        prob_reversed = self.model.predict_proba(X_reversed)[:, 1]  # P(player1 wins in reversed)
        
        # Combine probabilities for fairness
        # If original is (A vs B), then:
        # prob_original = P(A beats B)
        # prob_reversed = P(B beats A)
        # So final probability for A winning is:
        # P(A wins) = (P(A beats B) + (1 - P(B beats A))) / 2
        final_prob = (prob_original + (1 - prob_reversed)) / 2
        
        # Make predictions based on combined probability
        predictions = (final_prob > 0.5).astype(int)
        
        # Debug logging
        print("\nPrediction Debug Info:")
        print(f"Player 1 ID: {matches_df['player1_id'].iloc[0]}")
        print(f"Player 2 ID: {matches_df['player2_id'].iloc[0]}")
        print(f"Surface: {matches_df['surface'].iloc[0]}")
        print("\nElo Ratings:")
        print(f"Player 1 Elo: {X_original['player1_elo'].iloc[0]}")
        print(f"Player 2 Elo: {X_original['player2_elo'].iloc[0]}")
        print(f"Elo Difference: {X_original['elo_diff'].iloc[0]}")
        print("\nProbabilities:")
        print(f"Original (P1 wins): {prob_original[0]:.3f}")
        print(f"Reversed (P2 wins): {prob_reversed[0]:.3f}")
        print(f"Combined: {final_prob[0]:.3f}")
        
        # Add predictions to the dataframe
        matches_df['predicted_winner'] = np.where(predictions == 1, matches_df['player1_id'], matches_df['player2_id'])
        matches_df['win_probability'] = final_prob
        
        print(f"\nFinal Prediction: {predictions[0]}")
        print(f"Final Probability: {final_prob[0]:.3f}")
        
        return matches_df

    def validate_model(self, test_data_path='TML-Database-master/2023.csv'):
        """Validate the model's accuracy on historical matches"""
        print("\nValidating model on historical matches...")
        
        # Load test data
        test_data = pd.read_csv(test_data_path)
        test_data = test_data.dropna(subset=['winner_id', 'loser_id', 'surface'])
        
        # Create test matches dataframe
        test_matches = pd.DataFrame({
            'player1_id': test_data['winner_id'],
            'player2_id': test_data['loser_id'],
            'surface': test_data['surface']
        })
        
        # Get predictions
        predictions = self.predict_matches(test_matches)
        
        # Calculate accuracy
        correct_predictions = (predictions['predicted_winner'] == test_data['winner_id']).sum()
        total_matches = len(test_data)
        accuracy = correct_predictions / total_matches
        
        # Calculate ROC-AUC
        # For each match, we know the winner was player1 (since we set player1_id = winner_id)
        # So the true label is always 1
        y_true = np.ones(len(test_data))
        y_pred_proba = predictions['win_probability']
        
        try:
            auc = roc_auc_score(y_true, y_pred_proba)
            print(f"\nValidation Results:")
            print(f"Total matches tested: {total_matches}")
            print(f"Correct predictions: {correct_predictions}")
            print(f"Accuracy: {accuracy:.3f}")
            print(f"ROC-AUC: {auc:.3f}")
            
            # Print confusion matrix
            y_pred = (predictions['win_probability'] > 0.5).astype(int)
            cm = confusion_matrix(y_true, y_pred)
            print("\nConfusion Matrix:")
            print("True Negatives (Correctly predicted player2 wins):", cm[0][0])
            print("False Positives (Incorrectly predicted player1 wins):", cm[0][1])
            print("False Negatives (Incorrectly predicted player2 wins):", cm[1][0])
            print("True Positives (Correctly predicted player1 wins):", cm[1][1])
            
            # Print some example predictions
            print("\nExample Predictions:")
            for i in range(min(5, len(test_data))):
                print(f"\nMatch {i+1}:")
                print(f"Player 1 (Winner): {test_data['winner_id'].iloc[i]}")
                print(f"Player 2 (Loser): {test_data['loser_id'].iloc[i]}")
                print(f"Surface: {test_data['surface'].iloc[i]}")
                print(f"Predicted Winner: {predictions['predicted_winner'].iloc[i]}")
                print(f"Win Probability: {predictions['win_probability'].iloc[i]:.3f}")
                print(f"Correct: {predictions['predicted_winner'].iloc[i] == test_data['winner_id'].iloc[i]}")
            
            return accuracy, auc
            
        except ValueError as e:
            print(f"\nError calculating ROC-AUC: {e}")
            print("This might happen if all predictions are the same class.")
            print(f"\nBasic Validation Results:")
            print(f"Total matches tested: {total_matches}")
            print(f"Correct predictions: {correct_predictions}")
            print(f"Accuracy: {accuracy:.3f}")
            return accuracy, None

def main():
    # Create predictor instance (this will load or train the model)
    predictor = MatchPredictor()
    
    # Validate the model
    predictor.validate_model()
    
    # Example of predicting new matches
    # new_matches = pd.read_csv('new_matches.csv')
    # predictions = predictor.predict_matches(new_matches)
    # print("\nPredictions for new matches:")
    # print(predictions[['winner_id', 'loser_id', 'predicted_winner', 'win_probability']])

if __name__ == "__main__":
    main() 