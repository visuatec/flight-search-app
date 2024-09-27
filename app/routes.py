# Import necessary modules
from flask import Blueprint, render_template, jsonify, request
from models import get_airports_autocomplete  # Import the function from your models
import logging
import requests
import os
import time
import openai
from dotenv import load_dotenv

# Initialize Blueprint
main = Blueprint("main", __name__)

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
api_key = os.getenv("FLIGHT_API_KEY")
openai.api_key = os.getenv("CHATGPT")


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


def split_message(message, max_length):
    """Split a long message into smaller chunks."""
    return [message[i : i + max_length] for i in range(0, len(message), max_length)]


def format_data(user_message, api_key, retries=3, delay=5):
    max_message_length = 8000  # Adjust based on the token limit
    user_message_chunks = split_message(user_message, max_message_length)

    openai.api_key = api_key
    combined_output = []
    system_message = (
        "You are my travel planning assistant. You find the best flights for me."
    )
    for chunk in user_message_chunks:
        response = None
        for attempt in range(retries):
            try:
                response = openai.ChatCompletion.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": chunk},
                    ],
                )
                if response:
                    break
            except Exception as e:
                if attempt < retries - 1:
                    time.sleep(delay)
                else:
                    raise e

        if response and "choices" in response:
            choice = response.choices[0]
            formatted_data = choice["message"]["content"].strip()
            combined_output.append(formatted_data)
        else:
            raise ValueError(
                "The OpenAI API response did not contain the expected choices data."
            )

    # Combine all chunks into one response
    full_response = "".join(combined_output)

    # Debugging information: log the raw response
    print("OpenAI full response:", full_response)

    return full_response


@main.route("/send_prompt", methods=["POST"])
def send_prompt():
    try:
        data = request.json
        prompt = data.get("prompt", "")

        if not prompt:
            return jsonify({"error": "No prompt provided"}), 400

        response = format_data(prompt, openai.api_key, retries=3, delay=5)

        summary = response.strip()

        return jsonify({"summary": summary}), 200

    except openai.error.OpenAIError as e:
        logger.error(f"Error with OpenAI API: {e}")
        return jsonify({"error": "Failed to process data with OpenAI"}), 500


@main.route("/search-flights", methods=["GET"])
def search_flights():
    source_airport = request.args.get("source_airport")
    destination_airport = request.args.get("destination_airport")
    departure_date = request.args.get("departure_date")
    return_date = request.args.get("return_date")

    if not all([source_airport, destination_airport, departure_date]):
        logger.error("Error: Missing required parameters")
        return jsonify({"error": "Missing required parameters"}), 400

    logger.info(
        f"Searching flights from {source_airport} to {destination_airport} on {departure_date}"
    )

    try:
        flights = []
        page_token = None

        while True:
            url = f"https://api.flightapi.io/roundtrip/{api_key}/{source_airport}/{destination_airport}/{departure_date}/{return_date}/1/0/0/Economy/USD"
            params = {"page_token": page_token}
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            itineraries = data.get("itineraries", [])
            legs = {leg.get("id"): leg for leg in data.get("legs", [])}
            segments = {
                segment.get("id"): segment for segment in data.get("segments", [])
            }
            places = {place.get("id"): place for place in data.get("places", [])}
            carriers = {
                carrier.get("id"): carrier for carrier in data.get("carriers", [])
            }
            agents = {agent.get("id"): agent for agent in data.get("agents", [])}

            for itinerary in itineraries:
                # Extracting the price
                price_info = itinerary.get("pricing_options", [{}])[0].get(
                    "items", [{}]
                )[0]
                price = price_info.get("price", "N/A")

                flight_info = {
                    "itineraries": itinerary.get("id", "N/A"),
                    "deepLink": price_info.get("url", "N/A"),
                    "price": price,
                    "legs": [],
                    "segments": [],
                    "places": [],
                    "carriers": [],
                    "agents": [],
                }

                # Separate legs into departure and return
                departure_leg = []
                return_leg = []

                # Populate legs
                for leg_id in itinerary.get("leg_ids", []):
                    leg = legs.get(leg_id, {})
                    origin_place_id = leg.get("origin_place_id", "N/A")
                    destination_place_id = leg.get("destination_place_id", "N/A")
                    departure_time = leg.get("departure_time", "N/A")
                    arrival_time = leg.get("arrival_time", "N/A")
                    duration = leg.get("duration", "N/A")

                    leg_info = f"{origin_place_id}-{destination_place_id}-{departure_time[:8]}-{arrival_time[:8]}--{duration} mins"

                    if origin_place_id == source_airport:
                        departure_leg.append(leg_info)
                    else:
                        return_leg.append(leg_info)

                    # Populate segments within each leg
                    for segment_id in leg.get("segment_ids", []):
                        segment = segments.get(segment_id, {})
                        flight_info["segments"].append(segment)

                        # Populate places within each segment
                        origin_place = places.get(segment.get("origin_place_id"))
                        destination_place = places.get(
                            segment.get("destination_place_id")
                        )
                        if origin_place:
                            flight_info["places"].append(origin_place)
                        if destination_place:
                            flight_info["places"].append(destination_place)

                # Combine departure and return legs with a separator
                flight_info["legs"] = departure_leg + ["|"] + return_leg

                # Populate carriers based on segments
                for segment in flight_info["segments"]:
                    carrier = carriers.get(segment.get("marketing_carrier_id"))
                    if carrier:
                        flight_info["carriers"].append(carrier.get("name", "N/A"))

                # Populate agents
                for agent_id in itinerary.get("pricing_options", [{}])[0].get(
                    "agent_ids", []
                ):
                    agent = agents.get(agent_id)
                    if agent:
                        flight_info["agents"].append(agent.get("name", "N/A"))

                flights.append(flight_info)

            page_token = data.get("next_page_token")
            if not page_token:
                break

            time.sleep(1)  # To handle API rate limiting

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
