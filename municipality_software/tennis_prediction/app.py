from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
from match_predictor import MatchPredictor
import os

app = Flask(__name__)

# Initialize the predictor
predictor = MatchPredictor()

# Global variables for player data
player_db = None
name_to_id_map = None

def create_name_mapping(player_db):
    """Create a mapping of lowercase names to player IDs"""
    mapping = {}
    for _, row in player_db.iterrows():
        # Add full name mapping
        name_lower = row['name'].lower()
        mapping[name_lower] = row['player_id']
        
        # Add first name mapping
        first_name = name_lower.split()[0]
        mapping[first_name] = row['player_id']
        
        # Add last name mapping
        last_name = name_lower.split()[-1]
        mapping[last_name] = row['player_id']
    
    return mapping

# Load data
def load_data():
    try:
        # Load Elo ratings
        if not os.path.exists('final_elo_ratings_all_years.csv'):
            print("Error: Elo ratings file not found")
            return None, None
            
        predictor.load_elo_ratings('final_elo_ratings_all_years.csv')
        
        # Load or create player database
        if os.path.exists('player_database.csv'):
            print("Loading existing player database...")
            player_db = pd.read_csv('player_database.csv')
        else:
            print("Creating new player database...")
            if not os.path.exists('TML-Database-master/2023.csv'):
                print("Error: 2023 match data not found")
                return None, None
                
            # Create player database from all match data files
            all_players = []
            match_files = sorted([f for f in os.listdir('TML-Database-master') if f.endswith('.csv')])
            
            for file in match_files:
                print(f"Processing {file}...")
                match_data = pd.read_csv(f'TML-Database-master/{file}')
                
                # Get winner information
                winner_cols = {
                    'winner_id': 'player_id',
                    'winner_name': 'name'
                }
                
                # Add additional columns if they exist
                if 'winner_ht' in match_data.columns:
                    winner_cols['winner_ht'] = 'height'
                if 'winner_wt' in match_data.columns:
                    winner_cols['winner_wt'] = 'weight'
                if 'winner_hand' in match_data.columns:
                    winner_cols['winner_hand'] = 'plays'
                if 'winner_ioc' in match_data.columns:
                    winner_cols['winner_ioc'] = 'country'
                
                winners = match_data[list(winner_cols.keys())].rename(columns=winner_cols)
                
                # Get loser information
                loser_cols = {
                    'loser_id': 'player_id',
                    'loser_name': 'name'
                }
                
                # Add additional columns if they exist
                if 'loser_ht' in match_data.columns:
                    loser_cols['loser_ht'] = 'height'
                if 'loser_wt' in match_data.columns:
                    loser_cols['loser_wt'] = 'weight'
                if 'loser_hand' in match_data.columns:
                    loser_cols['loser_hand'] = 'plays'
                if 'loser_ioc' in match_data.columns:
                    loser_cols['loser_ioc'] = 'country'
                
                losers = match_data[list(loser_cols.keys())].rename(columns=loser_cols)
                
                # Combine and remove duplicates, keeping the most recent information
                all_players.extend([winners, losers])
            
            # Combine all player data
            player_db = pd.concat(all_players, ignore_index=True)
            
            # Remove duplicates, keeping the most recent information
            player_db = player_db.sort_values('player_id').drop_duplicates(subset=['player_id'], keep='last')
            
            # Clean up the data
            if 'height' in player_db.columns:
                player_db['height'] = pd.to_numeric(player_db['height'], errors='coerce')
            else:
                player_db['height'] = None
                
            if 'weight' in player_db.columns:
                player_db['weight'] = pd.to_numeric(player_db['weight'], errors='coerce')
            else:
                player_db['weight'] = None
                
            if 'plays' in player_db.columns:
                player_db['plays'] = player_db['plays'].fillna('unknown')
            else:
                player_db['plays'] = 'unknown'
                
            if 'country' in player_db.columns:
                player_db['country'] = player_db['country'].fillna('unknown')
            else:
                player_db['country'] = 'unknown'
            
            # Save the initial database
            player_db.to_csv('player_database.csv', index=False)
            print(f"Created player database with {len(player_db)} players")
        
        # Ensure name column exists and is string type
        if 'name' not in player_db.columns:
            print("Error: 'name' column not found in player database")
            return None, None
            
        player_db['name'] = player_db['name'].astype(str)
        
        # Create name to ID mapping
        name_to_id_map = create_name_mapping(player_db)
        
        print(f"Successfully loaded player database with {len(player_db)} players")
        print("Sample of player database:")
        print(player_db[['player_id', 'name', 'height', 'weight', 'plays', 'country']].head())
        return player_db, name_to_id_map
        
    except Exception as e:
        print(f"Error loading data: {str(e)}")
        return None, None

# Initialize player database and name mapping
player_db, name_to_id_map = load_data()
if player_db is None or name_to_id_map is None:
    print("Failed to initialize player database. Please check the data files.")
    exit(1)

@app.route('/')
def home():
    return render_template('index.html')

def find_player_id(player_name, player_db, name_to_id_map):
    """Find player ID from name using the name mapping"""
    if player_db is None or name_to_id_map is None:
        print("Error: Player database or name mapping is not initialized")
        return None
        
    player_name = player_name.lower()
    print(f"Searching for player: {player_name}")
    
    # Try exact match first
    if player_name in name_to_id_map:
        player_id = name_to_id_map[player_name]
        print(f"Found exact match: {player_name} -> {player_id}")
        return player_id
    
    # Try partial match
    for name, player_id in name_to_id_map.items():
        if player_name in name or name in player_name:
            print(f"Found partial match: {player_name} -> {name} ({player_id})")
            return player_id
    
    print(f"No match found for player name: {player_name}")
    return None

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if player_db is None or name_to_id_map is None:
            return jsonify({'error': 'Player database not initialized'})
            
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'})
            
        player1_name = data.get('player1_name')
        player2_name = data.get('player2_name')
        surface = data.get('surface')
        
        if not all([player1_name, player2_name, surface]):
            return jsonify({'error': 'Missing required fields: player1_name, player2_name, surface'})
        
        # Find player IDs
        player1_id = find_player_id(player1_name, player_db, name_to_id_map)
        player2_id = find_player_id(player2_name, player_db, name_to_id_map)
        
        if not player1_id or not player2_id:
            missing_players = []
            if not player1_id:
                missing_players.append(player1_name)
            if not player2_id:
                missing_players.append(player2_name)
            return jsonify({'error': f'Could not find player(s): {" ".join(missing_players)}'})
        
        # Create match data
        match_data = pd.DataFrame({
            'player1_id': [player1_id],
            'player2_id': [player2_id],
            'surface': [surface]
        })
        
        # Make prediction
        prediction_df = predictor.predict_matches(match_data)
        
        # Get winner's name
        winner_id = prediction_df['predicted_winner'].iloc[0]
        winner_name = player_db[player_db['player_id'] == winner_id]['name'].values[0]
        
        return jsonify({'winner': winner_name})
        
    except Exception as e:
        print(f"Error in prediction: {str(e)}")
        return jsonify({'error': str(e)})

@app.route('/add_player', methods=['POST'])
def add_player():
    global player_db, name_to_id_map
    try:
        if player_db is None or name_to_id_map is None:
            return jsonify({
                'status': 'error',
                'message': "Player database not initialized"
            })
            
        data = request.json
        new_player = pd.DataFrame([data])
        player_db = pd.concat([player_db, new_player], ignore_index=True)
        player_db.to_csv('player_database.csv', index=False)
        
        # Update name mapping
        name_to_id_map = create_name_mapping(player_db)
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080) 