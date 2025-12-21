"""
Interactive Eastern European Surname Classifier

This script provides an interactive interface for classifying surnames.
It prompts the user to input a surname and displays whether it's Eastern European or not.
"""

from eastern_european_surname_classifier import EasternEuropeanSurnameClassifier
import sys

def predict_eastern_european(name: str) -> tuple[float, bool]:
    """
    Predict if a surname is Eastern European.
    
    Args:
        name (str): The surname to classify
        
    Returns:
        tuple[float, bool]: (probability, is_eastern_european)
    """
    try:
        classifier = EasternEuropeanSurnameClassifier()
        classifier.load_model("eastern_european_surname_model.pkl")
        return classifier.predict_eastern_european(name)
    except FileNotFoundError:
        print("Error: Model file 'eastern_european_surname_model.pkl' not found!")
        print("Please run 'python eastern_european_surname_classifier.py' first to train the model.")
        return None, None
    except Exception as e:
        print(f"Error: {e}")
        return None, None

def main():
    """Interactive main function."""
    print("=" * 60)
    print("EASTERN EUROPEAN SURNAME CLASSIFIER")
    print("=" * 60)
    print("This classifier determines whether a surname is Eastern European")
    print("based on linguistic features from Croatia, Slovenia, Serbia,")
    print("Bosnia-Herzegovina, and Montenegro.")
    print()
    print("Threshold: 0.30 (≥ 0.30 = Eastern European, < 0.30 = Not Eastern European)")
    print("=" * 60)
    
    while True:
        print()
        # Get user input
        surname = input("Enter a surname to classify (or 'quit' to exit): ").strip()
        
        # Check for quit command
        if surname.lower() in ['quit', 'exit', 'q']:
            print("Goodbye!")
            break
        
        # Check for empty input
        if not surname:
            print("Please enter a valid surname.")
            continue
        
        # Make prediction
        probability, is_eastern_european = predict_eastern_european(surname)
        
        # Display results
        if probability is not None:
            print()
            print("=" * 40)
            print(f"SURNAME: {surname}")
            print("=" * 40)
            print(f"Probability: {probability:.3f}")
            print(f"Classification: {'EASTERN EUROPEAN' if is_eastern_european else 'NOT Eastern European'}")
            
            # Add confidence level
            if probability >= 0.8:
                confidence = "Very High"
            elif probability >= 0.6:
                confidence = "High"
            elif probability >= 0.4:
                confidence = "Medium"
            elif probability >= 0.2:
                confidence = "Low"
            else:
                confidence = "Very Low"
            
            print(f"Confidence: {confidence}")
            print("=" * 40)
        else:
            print("Could not classify the surname. Please try again.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nGoodbye!")
        sys.exit(0) 