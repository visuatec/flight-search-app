$(document).ready(function () {
    let airportsData = [];  // Variable to store airports data in memory

    // Fetch all airports data once when the page loads
    function fetchAllAirports() {
        $.ajax({
            url: '/get-airports',
            method: 'GET',
            dataType: 'json',
            success: function (data) {
                airportsData = data;  // Store the data in memory
                console.log("All Airports Data Loaded:", airportsData); // Debugging line
            },
            error: function (error) {
                console.error("Error fetching airports:", error); // Debugging line
            }
        });
    }

    // Function to filter airports based on user input
    function filterAirports(airports, term) {
        // Check if airports is an array
        if (!Array.isArray(airports)) {
            console.error("Expected an array for airports, but received:", airports);
            return [];
        }

        // Convert the search term to lowercase for case-insensitive comparison
        const searchTerm = term.toLowerCase();

        // Filter the airports based on whether the IATA code or the name includes the search term
        const filteredAirports = airports.filter(airport => {
            const name = airport.label ? airport.label.toLowerCase() : "";
            const code = airport.value ? airport.value.toLowerCase() : "";

            // Return true if either the IATA code or name includes the search term
            return code.includes(searchTerm) || name.includes(searchTerm);
        });

        // Sort the filtered airports to prioritize IATA code matches before name matches
        filteredAirports.sort((a, b) => {
            const aCode = a.value.toLowerCase();
            const aName = a.label.toLowerCase();
            const bCode = b.value.toLowerCase();
            const bName = b.label.toLowerCase();

            // Prioritize airports where the IATA code starts with the search term
            if (aCode.startsWith(searchTerm) && !bCode.startsWith(searchTerm)) return -1;
            if (!aCode.startsWith(searchTerm) && bCode.startsWith(searchTerm)) return 1;

            // If both or neither start with the search term, prioritize by alphabetical order of IATA code
            return aCode.localeCompare(bCode);
        });

        return filteredAirports;
    }


    // Set up autocomplete for Source Airport
    $("#source-airport").autocomplete({
        source: function (request, response) {
            console.log("Autocomplete Request for Source Airport:", request.term); // Debugging line
            const results = filterAirports(airportsData, request.term); // Pass airportsData and the search term
            console.log("Autocomplete Results for Source Airport:", results); // Debugging line
            response(results);
        },
        minLength: 2  // Minimum characters to trigger autocomplete
    });

    // Set up autocomplete for Destination Airport
    $("#destination-airport").autocomplete({
        source: function (request, response) {
            console.log("Autocomplete Request for Destination Airport:", request.term); // Debugging line
            const results = filterAirports(airportsData, request.term); // Pass airportsData and the search term
            console.log("Autocomplete Results for Destination Airport:", results); // Debugging line
            response(results);
        },
        minLength: 2
    });


    // Handle form submission for flight search
    $('#flight-form').on('submit', function (e) {
        e.preventDefault();
        const sourceAirport = $('#source-airport').val();
        const destinationAirport = $('#destination-airport').val();
        const departureDate = $('#departure-date').val();
        const arrivalDate = $('#arrival-date').val();

        $.ajax({
            url: '/search-flights',
            method: 'GET',
            data: {
                source_airport: sourceAirport,
                destination_airport: destinationAirport,
                departure_date: departureDate,
                arrival_date: arrivalDate,
            },
            success: function (flights) {
                const tableBody = $('#flights-table tbody');
                tableBody.empty();  // Clear any previous results

                flights.forEach(flight => {
                    tableBody.append(`
                        <tr>
                            <td>${flight.departure_airport}</td>
                            <td>${flight.departure_date_time}</td>
                            <td>${flight.arrival_airport}</td>
                            <td>${flight.arrival_date_time}</td>
                            <td>${flight.cost}</td>
                            <td>${flight.duration}</td>
                            <td>${flight.stops}</td>
                        </tr>
                    `);
                });

                $('#flights-table').show();  // Show the table with results
            },
            error: function (error) {
                console.error("Error fetching flight data:", error); // Debugging line
                alert('Failed to fetch flight data. Please try again.');
            }
        });
    });

    // Load all airports data when the page is ready
    fetchAllAirports();
});
