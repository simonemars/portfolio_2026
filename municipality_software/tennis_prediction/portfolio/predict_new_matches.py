import pandas as pd
import numpy as np
from match_predictor import MatchPredictor
import argparse
from datetime import datetime

def load_new_matches(file_path):
    """Load and validate new match data"""
    try:
        df = pd.read_csv(file_path)
        required_columns = ['winner_id', 'loser_id', 'surface']
        
        # Check for required columns
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")
        
        # Validate surface values
        valid_surfaces = ['Hard', 'Clay', 'Grass', 'Carpet']
        invalid_surfaces = df[~df['surface'].isin(valid_surfaces)]['surface'].unique()
        if len(invalid_surfaces) > 0:
            raise ValueError(f"Invalid surface values found: {invalid_surfaces}")
        
        return df
    
    except Exception as e:
        print(f"Error loading match data: {str(e)}")
        return None

def format_predictions(predictions_df):
    """Format predictions for better readability"""
    # Create a copy to avoid modifying the original
    formatted = predictions_df.copy()
    
    # Add timestamp
    formatted['prediction_time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Format probability as percentage
    formatted['win_probability'] = formatted['win_probability'].apply(lambda x: f"{x:.1%}")
    
    # Select and reorder columns
    output_columns = [
        'prediction_time',
        'winner_id',
        'loser_id',
        'surface',
        'predicted_winner',
        'win_probability'
    ]
    
    return formatted[output_columns]

def save_predictions(predictions_df, output_file):
    """Save predictions to CSV file"""
    try:
        predictions_df.to_csv(output_file, index=False)
        print(f"\nPredictions saved to {output_file}")
    except Exception as e:
        print(f"Error saving predictions: {str(e)}")

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Predict winners for new tennis matches')
    parser.add_argument('input_file', help='Path to CSV file containing new matches')
    parser.add_argument('--output', '-o', default='match_predictions.csv',
                      help='Output file path (default: match_predictions.csv)')
    parser.add_argument('--elo-file', '-e', default='final_elo_ratings_all_years.csv',
                      help='Path to Elo ratings file (default: final_elo_ratings_all_years.csv)')
    
    args = parser.parse_args()
    
    # Load new matches
    print(f"Loading matches from {args.input_file}...")
    new_matches = load_new_matches(args.input_file)
    if new_matches is None:
        return
    
    print(f"Loaded {len(new_matches)} matches")
    
    # Initialize predictor and load Elo ratings
    print(f"Loading Elo ratings from {args.elo_file}...")
    predictor = MatchPredictor()
    predictor.load_elo_ratings(args.elo_file)
    
    # Generate predictions
    print("\nGenerating predictions...")
    predictions = predictor.predict_matches(new_matches)
    
    # Format predictions
    formatted_predictions = format_predictions(predictions)
    
    # Display predictions
    print("\nPredictions:")
    print(formatted_predictions.to_string(index=False))
    
    # Save predictions
    save_predictions(formatted_predictions, args.output)

if __name__ == "__main__":
    main() 