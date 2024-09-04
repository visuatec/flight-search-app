from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Boolean, Float, or_
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Get the database URL from the environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

# Check if DATABASE_URL is loaded correctly
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set. Check your .env file.")

# Initialize the database
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

Base = declarative_base()


# Define the Airport model
class Airport(Base):
    __tablename__ = "airports"

    id = Column(Integer, primary_key=True)
    ident = Column(String(10))
    type = Column(String(50))
    name = Column(String(255))
    latitude_deg = Column(Float)
    longitude_deg = Column(Float)
    elevation_ft = Column(Integer)
    continent = Column(String(2))
    iso_country = Column(String(2))
    iso_region = Column(String(10))
    municipality = Column(String(255))
    scheduled_service = Column(Boolean)
    gps_code = Column(String(10))
    iata_code = Column(String(10))
    local_code = Column(String(10))
    home_link = Column(String)
    wikipedia_link = Column(String)
    keywords = Column(String)


# Function to query airports for autocomplete
def get_airports_autocomplete(term):
    # Query the table filtering by name or iata_code, excluding None values
    results = (
        session.query(Airport)
        .filter(
            or_(Airport.name.ilike(f"%{term}%"), Airport.iata_code.ilike(f"%{term}%")),
            Airport.iata_code.isnot(None),  # Exclude entries with None iata_code
        )
        .all()
    )

    # Format the results as needed for autocomplete
    airports = [
        {"label": f"{airport.name} ({airport.iata_code})", "value": airport.iata_code}
        for airport in results
    ]
    return airports
