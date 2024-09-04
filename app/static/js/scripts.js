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
    function filterAirports(term) {
        // Ensure the data is not empty and filter by term
        return airportsData
            .filter(airport => 
                airport.name.toLowerCase().includes(term.toLowerCase()) || 
                airport.code.toLowerCase().includes(term.toLowerCase())
            )
            .map(airport => ({
                label: `${airport.name} (${airport.code})`,
                value: airport.code
            }));
    }

    // Set up autocomplete for Source Airport
    $("#source-airport").autocomplete({
        source: function (request, response) {
            console.log("Autocomplete Request for Source Airport:", request.term); // Debugging line
            const results = filterAirports(request.term);
            console.log("Autocomplete Results for Source Airport:", results); // Debugging line
            response(results);
        },
        minLength: 2  // Minimum characters to trigger autocomplete
    });

    // Set up autocomplete for Destination Airport
    $("#destination-airport").autocomplete({
        source: function (request, response) {
            console.log("Autocomplete Request for Destination Airport:", request.term); // Debugging line
            const results = filterAirports(request.term);
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

        $.ajax({
            url: '/search-flights',
            method: 'GET',
            data: {
                source_airport: sourceAirport,
                destination_airport: destinationAirport,
                departure_date: departureDate,
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
