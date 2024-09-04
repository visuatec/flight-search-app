# Import necessary modules
from flask import Blueprint, render_template, jsonify, request
from models import get_airports_autocomplete  # Import the function from your models
import logging

# Initialize Blueprint
main = Blueprint("main", __name__)

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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
        logger.info(f"Found airports: {airports}")
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
