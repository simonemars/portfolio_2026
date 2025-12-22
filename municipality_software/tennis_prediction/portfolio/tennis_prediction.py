import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.feature_selection import SelectKBest, f_classif, mutual_info_classif
import os
import glob
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

#loads the data, formats it then checks the importance that each has for the prediction of the winner

def load_data(csv_path):
    """
    Load the tennis match data from CSV file
    """
    try:
        data = pd.read_csv(csv_path)
        return data
    except FileNotFoundError:
        print(f"Error: Could not find the CSV file at {csv_path}")
        return None
    except Exception as e:
        print(f"Error loading data: {str(e)}")
        return None

def process_all_files():
    """
    Process all CSV files in the TML-Database-master directory
    """
    data_dir = "TML-Database-master"
    csv_files = glob.glob(os.path.join(data_dir, "*.csv"))
    csv_files = [f for f in csv_files if "ongoing_tourneys" not in f]
    csv_files.sort()
    all_data = []
    for csv_file in csv_files:
        print(f"\nProcessing {os.path.basename(csv_file)}...")
        data = load_data(csv_file)
        if data is not None:
            print(f"Successfully loaded {len(data)} rows")
            all_data.append(data)
    
    if all_data:
        combined_data = pd.concat(all_data, ignore_index=True)
        print(f"\nTotal combined data: {len(combined_data)} rows")
        return combined_data
    return None

def clean_and_prepare_data(df, target_column):
    """
    Clean and prepare the data for analysis and modeling
    """
    # Make a copy
    df = df.copy()
    
    # Handle missing values
    numeric_columns = df.select_dtypes(include=[np.number]).columns
    categorical_columns = df.select_dtypes(include=['object']).columns
    
    # Clean numeric columns
    for col in numeric_columns:
        # Replace inf and -inf with NaN
        df[col] = df[col].replace([np.inf, -np.inf], np.nan)
        # Fill NaN with median
        df[col] = df[col].fillna(df[col].median())
    
    # Clean categorical columns
    for col in categorical_columns:
        df[col] = df[col].fillna(df[col].mode()[0])
    
    # Encode categorical variables
    label_encoders = {}
    for col in categorical_columns:
        if col != target_column:
            label_encoders[col] = LabelEncoder()
            df[col] = label_encoders[col].fit_transform(df[col].astype(str))
    
    return df, label_encoders

def analyze_feature_importance(df, target_column):
    """
    Analyze feature importance using multiple methods
    """
    print("\nAnalyzing feature importance...")
    
    # Prepare data
    X = df.drop([target_column], axis=1)
    y = df[target_column]
    
    # 1. Statistical Tests
    print("\nPerforming statistical tests...")
    f_scores, _ = f_classif(X, y)
    mi_scores = mutual_info_classif(X, y)
    
    # 2. Random Forest Importance
    print("Calculating Random Forest importance...")
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X, y)
    rf_importance = rf.feature_importances_
    
    # 3. Gradient Boosting Importance
    print("Calculating Gradient Boosting importance...")
    gb = GradientBoostingClassifier(n_estimators=100, random_state=42)
    gb.fit(X, y)
    gb_importance = gb.feature_importances_
    
    # Combine all importance scores
    importance_df = pd.DataFrame({
        'Feature': X.columns,
        'F_Score': f_scores,
        'Mutual_Info': mi_scores,
        'RF_Importance': rf_importance,
        'GB_Importance': gb_importance
    })
    
    # Calculate average importance
    importance_df['Average_Importance'] = importance_df[['F_Score', 'Mutual_Info', 'RF_Importance', 'GB_Importance']].mean(axis=1)
    importance_df = importance_df.sort_values('Average_Importance', ascending=False)
    
    # Create visualizations
    plt.figure(figsize=(15, 8))
    sns.barplot(x='Average_Importance', y='Feature', data=importance_df.head(20))
    plt.title('Top 20 Most Important Features')
    plt.tight_layout()
    plt.savefig('analysis_plots/feature_importance.png')
    plt.close()
    
    # Save importance scores
    importance_df.to_csv('feature_importance_analysis.csv', index=False)
    
    return importance_df

def create_feature_plots(df, target_column, top_features):
    """
    Create detailed plots for top features
    """
    print("\nCreating feature plots...")
    
    if not os.path.exists('analysis_plots'):
        os.makedirs('analysis_plots')
    
    for feature in top_features:
        plt.figure(figsize=(12, 6))
        
        if pd.api.types.is_numeric_dtype(df[feature]):
            # For numeric features
            sns.boxplot(x=target_column, y=feature, data=df)
            plt.title(f'{feature} vs {target_column}')
        else:
            # For categorical features
            contingency = pd.crosstab(df[feature], df[target_column])
            contingency.plot(kind='bar', stacked=True)
            plt.title(f'{feature} vs {target_column}')
        
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(f'analysis_plots/{feature}_analysis.png')
        plt.close()

def optimize_model(df, target_column, top_features):
    """
    Optimize model using the best features
    """
    print("\nOptimizing model...")
    
    # Prepare data
    X = df[top_features]
    y = df[target_column]
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Define models to try
    models = {
        'Decision Tree': DecisionTreeClassifier(random_state=42),
        'Random Forest': RandomForestClassifier(random_state=42),
        'Gradient Boosting': GradientBoostingClassifier(random_state=42)
    }
    
    # Define parameter grids
    param_grids = {
        'Decision Tree': {
            'max_depth': [3, 5, 7, 10, 15, 20],
            'min_samples_split': [2, 5, 10, 20],
            'min_samples_leaf': [1, 2, 4, 8],
            'criterion': ['gini', 'entropy']
        },
        'Random Forest': {
            'n_estimators': [100, 200, 300],
            'max_depth': [10, 20, 30, None],
            'min_samples_split': [2, 5, 10],
            'min_samples_leaf': [1, 2, 4]
        },
        'Gradient Boosting': {
            'n_estimators': [100, 200, 300],
            'learning_rate': [0.01, 0.1, 0.2],
            'max_depth': [3, 5, 7],
            'min_samples_split': [2, 5, 10]
        }
    }
    
    best_model = None
    best_score = 0
    best_model_name = None
    
    # Try each model
    for model_name, model in models.items():
        print(f"\nOptimizing {model_name}...")
        grid_search = GridSearchCV(
            model, 
            param_grids[model_name],
            cv=5,
            scoring='accuracy',
            n_jobs=-1
        )
        grid_search.fit(X_train_scaled, y_train)
        
        # Get best score
        score = grid_search.best_score_
        print(f"Best {model_name} score: {score:.4f}")
        
        if score > best_score:
            best_score = score
            best_model = grid_search.best_estimator_
            best_model_name = model_name
    
    # Evaluate best model
    print(f"\nBest model: {best_model_name}")
    print(f"Best cross-validation score: {best_score:.4f}")
    
    # Make predictions
    y_pred = best_model.predict(X_test_scaled)
    
    # Print performance metrics
    print("\nModel Performance:")
    print("Accuracy:", accuracy_score(y_test, y_pred))
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Create confusion matrix
    plt.figure(figsize=(8, 6))
    cm = confusion_matrix(y_test, y_pred)
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
    plt.title('Confusion Matrix')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.savefig('analysis_plots/confusion_matrix.png')
    plt.close()
    
    return best_model, scaler

def main():
    # Load and process data
    print("Loading and processing data...")
    data = process_all_files()
    
    if data is not None:
        # Select target column
        print("\nAvailable columns:")
        print(data.columns.tolist())
        target_column = input("\nEnter the column name for the target variable (e.g., 'winner_id'): ")
        
        if target_column not in data.columns:
            print(f"Error: Column '{target_column}' not found")
            return
        
        # Clean and prepare data
        print("\nCleaning and preparing data...")
        cleaned_data, label_encoders = clean_and_prepare_data(data, target_column)
        
        # Analyze feature importance
        importance_df = analyze_feature_importance(cleaned_data, target_column)
        
        # Select top features
        top_n = int(input("\nEnter number of top features to use (e.g., 10): "))
        top_features = importance_df['Feature'].head(top_n).tolist()
        
        # Create feature plots
        create_feature_plots(cleaned_data, target_column, top_features)
        
        # Optimize and train model
        best_model, scaler = optimize_model(cleaned_data, target_column, top_features)
        
        # Save model and scaler
        import joblib
        joblib.dump(best_model, 'best_model.joblib')
        joblib.dump(scaler, 'scaler.joblib')
        joblib.dump(label_encoders, 'label_encoders.joblib')
        
        print("\nAnalysis complete! Check the 'analysis_plots' directory for visualizations.")
        print("Model and preprocessing objects have been saved.")

if __name__ == "__main__":
    main() 