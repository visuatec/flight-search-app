# Import necessary modules
from flask import Blueprint, render_template, jsonify, request
import logging, os
from dotenv import load_dotenv
import requests

# Load environment variables from .env file
load_dotenv()

# Initialize Blueprint
main = Blueprint("main", __name__)

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Base URL for FlightAware API
BASE_URL = "https://aeroapi.flightaware.com/aeroapi"

# Your FlightAware API key
API_KEY = os.getenv("FLIGHTAWARE_API_KEY")

# Headers for the API requests
HEADERS = {"x-apikey": API_KEY}


# Route for the home page
@main.route("/")
def index():
    return render_template("index.html")


# Route to fetch airport data
@main.route("/get-airports", methods=["GET"])
def get_airports():
    keyword = request.args.get("keyword", "")
    limit = request.args.get("limit", 10)  # Add limit to manage large data

    # Log the incoming parameters for debugging
    logger.info(f"Fetching airports with keyword: '{keyword}'")

    try:
        # Construct the API URL
        api_url = f"{BASE_URL}/airports"
        params = {"query": keyword, "limit": limit}
        response = requests.get(api_url, headers=HEADERS, params=params)
        response.raise_for_status()  # Raise an error for bad responses

        data = response.json()
        logger.info("Full API Response: %s", data)

        # Extracting airport data
        airports = [
            {
                "name": airport.get("name", "Unknown"),
                "code": airport.get("code", "Unknown"),
                "city": airport.get("city", "Unknown"),
                "country": airport.get("country", "Unknown"),
                "latitude": airport.get("latitude", "Unknown"),
                "longitude": airport.get("longitude", "Unknown"),
            }
            for airport in data.get("airports", [])
        ]

        logger.info("Filtered Airports Data: %s", airports)
        return jsonify(airports)
    except requests.exceptions.RequestException as e:
        logger.error("Error fetching airports from API: %s", e)
        return jsonify({"error": "Failed to fetch airports"}), 500
    except Exception as e:
        logger.error("Unexpected error: %s", e)
        return jsonify({"error": "An unexpected error occurred"}), 500


# Route to search for flights between two airports on specified dates
@main.route("/search-flights", methods=["GET"])
def search_flights():
    source_airport = request.args.get("source_airport")
    destination_airport = request.args.get("destination_airport")
    departure_date = request.args.get("departure_date")

    # Check if all required parameters are present
    if not all([source_airport, destination_airport, departure_date]):
        logger.error("Error: Missing required parameters")
        return jsonify({"error": "Missing required parameters"}), 400

    # Example placeholder for flight search implementation
    # Replace this with actual API calls to a flight search service if available
    try:
        # Dummy response to mimic the structure you need
        flights = [
            {
                "departure_airport": source_airport,
                "departure_date_time": departure_date + "T08:00:00",  # Example format
                "arrival_airport": destination_airport,
                "arrival_date_time": departure_date + "T12:00:00",  # Example format
                "airline": "FA",  # Example airline code
                "flight_number": "FA1234",
                "cost": "250.00",  # Example cost
                "duration": "4h",
                "stops": 0,
            }
        ]

        logger.info("Filtered Flights Data: %s", flights)
        return jsonify(flights)
    except Exception as e:
        logger.error("Unexpected error: %s", e)
        return jsonify({"error": "An unexpected error occurred"}), 500
