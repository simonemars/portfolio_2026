import pandas as pd
import numpy as np
from datetime import datetime
import glob
import os

def calculate_elo_change(winner_elo, loser_elo, k_factor=32):
    """Calculate Elo rating changes for a match"""
    # Calculate expected scores
    expected_winner = 1 / (1 + 10 ** ((loser_elo - winner_elo) / 400))
    expected_loser = 1 - expected_winner
    
    # Calculate new ratings
    winner_new = winner_elo + k_factor * (1 - expected_winner)
    loser_new = loser_elo + k_factor * (0 - expected_loser)
    
    return winner_new, loser_new

def initialize_player_elo(player_id, elo_dict):
    """Initialize a new player's Elo ratings for all surfaces"""
    if player_id not in elo_dict:
        elo_dict[player_id] = {
            "Hard": 1000,
            "Clay": 1000,
            "Grass": 1000,
            "Carpet": 1000 
        }
    return elo_dict[player_id]

def process_all_files():
    """Process all CSV files in chronological order"""
    # Initialize player Elo ratings
    player_elos = {}  # Dictionary to store current Elo ratings
    elo_history = []  # List to store all Elo rating changes
    
    # Get all CSV files in the TML-Database-master directory
    csv_files = glob.glob('TML-Database-master/*.csv')
    csv_files.sort()  # Sort files to process them chronologically
    
    print(f"Found {len(csv_files)} files to process\n")
    
    for file in csv_files:
        year = file.split('/')[-1].split('.')[0]
        print(f"Processing {year}...")
        
        # Read the CSV file
        df = pd.read_csv(file)
        
        # Process each match
        for _, match in df.iterrows():
            winner_id = str(match['winner_id'])
            loser_id = str(match['loser_id'])
            surface = match['surface'] if pd.notna(match['surface']) else 'Hard'
            
            # Initialize players if they don't exist
            if winner_id not in player_elos:
                player_elos[winner_id] = {'Hard': 1000, 'Clay': 1000, 'Grass': 1000, 'Carpet': 1000}
            if loser_id not in player_elos:
                player_elos[loser_id] = {'Hard': 1000, 'Clay': 1000, 'Grass': 1000, 'Carpet': 1000}
            
            # Get current Elo ratings
            winner_before = player_elos[winner_id][surface]
            loser_before = player_elos[loser_id][surface]
            
            # Calculate new Elo ratings
            winner_after, loser_after = calculate_elo_change(winner_before, loser_before)
            
            # Update player Elo ratings
            player_elos[winner_id][surface] = winner_after
            player_elos[loser_id][surface] = loser_after
            
            # Record Elo history
            elo_history.append({
                'date': match['tourney_date'],
                'winner_id': winner_id,
                'loser_id': loser_id,
                'surface': surface,
                'winner_elo_before': winner_before,
                'loser_elo_before': loser_before,
                'winner_elo_after': winner_after,
                'loser_elo_after': loser_after
            })
    
    # Convert history to DataFrame
    elo_df = pd.DataFrame(elo_history)
    
    # Save final Elo ratings
    final_elos = []
    for player_id, surfaces in player_elos.items():
        for surface, elo in surfaces.items():
            final_elos.append({
                'player_id': player_id,
                'surface': surface,
                'elo': elo
            })
    
    final_elos_df = pd.DataFrame(final_elos)
    final_elos_df.to_csv('final_elo_ratings_all_years.csv', index=False)
    elo_df.to_csv('elo_history_all_years.csv', index=False)
    
    return elo_df, player_elos

def analyze_elo_ratings(elo_df, player_elos):
    """Analyze and display Elo rating statistics"""
    print("\nElo Rating Statistics:")
    print(f"Total matches processed: {len(elo_df)}")
    print(f"Total unique players: {len(player_elos)}")
    
    # Calculate average Elo by surface
    surface_elos = {}
    for player_id, elos in player_elos.items():
        for surface, elo in elos.items():
            if surface not in surface_elos:
                surface_elos[surface] = []
            surface_elos[surface].append(elo)
    
    print("\nAverage Elo by surface:")
    for surface, elos in surface_elos.items():
        print(f"{surface}: {np.mean(elos):.2f}")
    
    # Display top 10 players by average Elo across all surfaces
    player_avg_elos = {}
    for player_id, elos in player_elos.items():
        player_avg_elos[player_id] = np.mean(list(elos.values()))
    
    top_players = sorted(player_avg_elos.items(), key=lambda x: x[1], reverse=True)[:10]
    print("\nTop 10 players by average Elo rating:")
    for player_id, avg_elo in top_players:
        print(f"Player {player_id}: {avg_elo:.2f}")
    
    return surface_elos, player_avg_elos

if __name__ == "__main__":
    # Process all files and calculate Elo ratings
    elo_df, player_elos = process_all_files()
    
    # Analyze and display results
    surface_elos, player_avg_elos = analyze_elo_ratings(elo_df, player_elos)
    
    # Save results to CSV
    elo_df.to_csv("elo_history_all_years.csv", index=False)
    
    # Create a DataFrame of final player ratings
    final_ratings = []
    for player_id, elos in player_elos.items():
        ratings = {'player_id': player_id}
        ratings.update(elos)
        final_ratings.append(ratings)
    
    final_ratings_df = pd.DataFrame(final_ratings)
    final_ratings_df.to_csv("final_elo_ratings_all_years.csv", index=False)
    
    # Save yearly statistics
    yearly_stats = elo_df.groupby('year').agg({
        'winner_id': 'count',
        'winner_elo_before': 'mean',
        'loser_elo_before': 'mean'
    }).rename(columns={'winner_id': 'matches_played'})
    
    yearly_stats.to_csv("yearly_elo_statistics.csv") 