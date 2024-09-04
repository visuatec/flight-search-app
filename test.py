from amadeus import Client
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()
# Initialize the Amadeus Client


amadeus = Client(
    client_id=os.getenv("AMADEUS_API_KEY"),
    client_secret=os.getenv("AMADEUS_API_SECRET"),
    log_level="debug",
)

# Test the connection by making a simple API call
try:
    response = amadeus.reference_data.locations.get(keyword="Athens", subType="CITY")
    print(response.data)
except Exception as e:
    print(f"Error: {e}")
