# Import necessary modules
from flask import Blueprint, render_template, jsonify, request
from models import get_airports_autocomplete  # Import the function from your models
import logging
import requests
import os
import time
from dotenv import load_dotenv

# Initialize Blueprint
main = Blueprint("main", __name__)

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
api_key = os.getenv("FLIGHT_API_KEY")


# Route for the home page
@main.route("/")
def index():
    return render_template("index.html")


# Route to fetch airport data for autocomplete
@main.route("/get-airports", methods=["GET"])
def get_airports():
    term = request.args.get("keyword", "")
    logger.info(f"Fetching airports for term: '{term}'")

    try:
        # Query the database for matching airports
        airports = get_airports_autocomplete(term)
        logger.info(f"Found airports: {len(airports)}")
        return jsonify(airports)
    except Exception as e:
        logger.error(f"Error fetching airports: {e}")
        return jsonify({"error": "Failed to fetch airports"}), 500


# Route to search for flights between two airports on specified dates
@main.route("/search-flights", methods=["GET"])
def search_flights():
    source_airport = request.args.get("source_airport")
    destination_airport = request.args.get("destination_airport")
    departure_date = request.args.get("departure_date")
    return_date = request.args.get("return_date")  # Optional, include if round trip

    # Check if all required parameters are present
    if not all([source_airport, destination_airport, departure_date]):
        logger.error("Error: Missing required parameters")
        return jsonify({"error": "Missing required parameters"}), 400

    logger.info(
        f"Searching flights from {source_airport} to {destination_airport} on {departure_date}"
    )

    try:
        flights = []
        page_token = None  # Initialize pagination token if your API uses one

        # Loop to handle multiple API calls if necessary
        while True:
            url = f"https://api.flightapi.io/roundtrip/{api_key}/{source_airport}/{destination_airport}/{departure_date}/{return_date}/1/0/0/Economy/USD"
            params = {
                "page_token": page_token
            }  # Add pagination token to the request if necessary
            response = requests.get(url, params=params)
            response.raise_for_status()  # Raise exception for HTTP errors
            data = response.json()

            flights.extend(data.get("itineraries", []))
            page_token = data.get("next_page_token")  # Update token from response
            if not page_token:
                break  # Exit loop if no more data is available

            # Implement delay if needed to comply with API rate limits
            time.sleep(1)

        if not flights:
            logger.info("No flights found for the given criteria")
            return jsonify({"message": "No flights found"}), 404

        logger.info("Flights data fetched successfully")
        return jsonify(flights)
    except requests.exceptions.RequestException as e:
        logger.error(f"API request error: {e}")
        return (
            jsonify({"error": "Failed to fetch flights from API", "details": str(e)}),
            500,
        )
    except ValueError as e:
        logger.error(f"JSON decoding error: {e}")
        return jsonify({"error": "Invalid response from API", "details": str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return (
            jsonify({"error": "An unexpected error occurred", "details": str(e)}),
            500,
        )
