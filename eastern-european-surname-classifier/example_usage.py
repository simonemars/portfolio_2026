"""
Example usage of the Eastern European Surname Classifier

This script demonstrates how to use the trained classifier to predict
whether surnames are Eastern European.
"""

from eastern_european_surname_classifier import EasternEuropeanSurnameClassifier

def predict_eastern_european(name: str) -> tuple[float, bool]:
    """
    Reusable function to predict if a surname is Eastern European.
    
    Args:
        name (str): The surname to classify
        
    Returns:
        tuple[float, bool]: (probability, is_eastern_european)
    """
    # Load the trained model
    classifier = EasternEuropeanSurnameClassifier()
    classifier.load_model("eastern_european_surname_model.pkl")
    
    # Make prediction
    return classifier.predict_eastern_european(name)

def main():
    """Demonstrate the classifier with various surnames."""
    
    # Test surnames from different regions
    test_surnames = [
        # Eastern European surnames
        "Kovačević",    # Croatian
        "Novak",        # Slovenian  
        "Jovanović",    # Serbian
        "Petrović",     # Serbian
        "Horvat",       # Croatian/Slovenian
        "Kovač",        # Croatian/Slovenian
        "Nikolić",      # Serbian
        "Marković",     # Serbian
        "Blažević",     # Croatian
        "Božić",        # Croatian
        
        # Non-Eastern European surnames
        "Smith",        # English
        "Garcia",       # Spanish
        "Müller",       # German
        "Johnson",      # English
        "Brown",        # English
        "Davis",        # English
        "Wilson",       # English
        "Anderson",     # English
        "Taylor",       # English
        "Thomas",       # English
    ]
    
    print("Eastern European Surname Classifier")
    print("=" * 50)
    print("Testing various surnames...\n")
    
    for surname in test_surnames:
        try:
            probability, is_eastern_european = predict_eastern_european(surname)
            status = "EASTERN EUROPEAN" if is_eastern_european else "NOT Eastern European"
            print(f"{surname:15} -> {probability:.3f} -> {status}")
        except Exception as e:
            print(f"{surname:15} -> Error: {e}")
    
    print("\n" + "=" * 50)
    print("Usage Notes:")
    print("- Probability ≥ 0.30: Classified as Eastern European")
    print("- Probability < 0.30: Classified as NOT Eastern European")
    print("- Model trained on surnames from Croatia, Slovenia, Serbia,")
    print("  Bosnia-Herzegovina, and Montenegro")

if __name__ == "__main__":
    main() 