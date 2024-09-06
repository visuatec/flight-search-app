import requests
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Replace with your actual API key and other parameters
api_key = os.getenv("FLIGHT_API_KEY")
departure_airport_code = "JFK"  # Example departure airport code
arrival_airport_code = "LAX"  # Example arrival airport code
departure_date = "2024-09-15"  # Example departure date
arrival_date = "2024-09-22"  # Example return date

url = f"https://api.flightapi.io/roundtrip/{api_key}/{departure_airport_code}/{arrival_airport_code}/{departure_date}/{arrival_date}/1/0/0/Economy/USD"

try:
    response = requests.get(url)
    response.raise_for_status()  # Raise an exception for HTTP errors
    data = response.json()  # Parse JSON response
    print(data)  # Print the data for inspection
except requests.exceptions.RequestException as e:
    print(f"An error occurred: {e}")
