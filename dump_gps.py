from google.cloud import firestore

# Initialize Firestore client
db = firestore.Client(project="boat-crumbs")

# Fetch documents from Firestore
try:
    docs = db.collection("gps_data").stream()
    for doc in docs:
        print(f"{doc.id} => {doc.to_dict()}")
except Exception as e:
    print(f"Error accessing Firestore: {e}")
