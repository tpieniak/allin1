import json
from datetime import datetime

def analyze_flix_prices(api_data_json):
    """
    Processes CoinGecko API data to extract monthly high and low prices for FLIX.

    Args:
        api_data_json (str): A JSON string simulating the API response.
                             Example: '{ "prices": [[1682899200000, 0.10], ...] }'

    Returns:
        list: A list of dictionaries, where each dictionary represents a month and
              contains: year (int), month (int), high_price (float), low_price (float).
    """
    try:
        data = json.loads(api_data_json)
        prices = data.get("prices", [])
    except json.JSONDecodeError:
        print("Error: Invalid JSON input.")
        return []

    if not prices:
        return []

    monthly_data = {}

    for timestamp_ms, price_usd in prices:
        try:
            # Convert timestamp from milliseconds to seconds for datetime
            dt_object = datetime.fromtimestamp(timestamp_ms / 1000)
            year = dt_object.year
            month = dt_object.month
        except ValueError:
            print(f"Warning: Could not process timestamp {timestamp_ms}. Skipping entry.")
            continue
        
        # Filter for the specified date range: May 1, 2023, to April 30, 2025
        if not ((year == 2023 and month >= 5) or \
                (year == 2024) or \
                (year == 2025 and month <= 4)):
            continue

        month_key = (year, month)

        if month_key not in monthly_data:
            monthly_data[month_key] = {
                "year": year,
                "month": month,
                "high_price": price_usd,
                "low_price": price_usd,
            }
        else:
            if price_usd > monthly_data[month_key]["high_price"]:
                monthly_data[month_key]["high_price"] = price_usd
            if price_usd < monthly_data[month_key]["low_price"]:
                monthly_data[month_key]["low_price"] = price_usd
    
    # Convert dictionary to list of dictionaries and sort by year, then month
    result = sorted(list(monthly_data.values()), key=lambda x: (x['year'], x['month']))
    return result

# --- Sample Data and Test ---
# Timestamps are in milliseconds.
# May 1, 2023: 1682899200000
# June 1, 2023: 1685577600000
# July 1, 2023: 1688169600000
# ...
# April 1, 2025: 1743580800000
# April 30, 2025: 1746086400000


sample_api_data = {
    "prices": [
        # May 2023
        [1682899200000, 0.10], # May 1
        [1682985600000, 0.11], # May 2
        [1683072000000, 0.09], # May 3 (new low for May)
        [1684540800000, 0.12], # May 20 (new high for May)
        [1685491200000, 0.11], # May 31
        # June 2023
        [1685577600000, 0.15], # June 1 (new high and low for June)
        [1685664000000, 0.14], # June 2
        [1686009600000, 0.11], # June 6 (new low for June)
        [1687046400000, 0.16], # June 18 (new high for June)
        # July 2023
        [1688169600000, 0.17], # July 1
        [1688256000000, 0.18], # July 2
        # Test data outside the range (should be ignored)
        [1672531200000, 0.05], # Jan 1, 2023 (before May 2023)
        [1748908800000, 0.25], # May 31, 2025 (after April 2025)
        # April 2025
        [1743580800000, 0.20], # April 1, 2025
        [1743667200000, 0.22], # April 2, 2025
        [1744876800000, 0.19], # April 15, 2025 (new low for April 2025)
        [1746086400000, 0.23], # April 30, 2025 (new high for April 2025)
    ]
}

if __name__ == "__main__":
    print("Starting FLIX price analysis...")
    sample_json_data = json.dumps(sample_api_data)
    
    # Test with sample data
    print("\nTesting with sample_api_data:")
    monthly_summary = analyze_flix_prices(sample_json_data)
    if monthly_summary:
        for month_info in monthly_summary:
            print(f"  Year: {month_info['year']}, Month: {month_info['month']}, "
                  f"High: {month_info['high_price']:.2f}, Low: {month_info['low_price']:.2f}")
    else:
        print("  No data processed or an error occurred.")

    # Test with empty data
    print("\nTesting with empty prices array:")
    empty_data_json = json.dumps({"prices": []})
    monthly_summary_empty = analyze_flix_prices(empty_data_json)
    if not monthly_summary_empty:
        print("  Correctly returned empty list for empty prices.")
    else:
        print(f"  Error: Expected empty list, got: {monthly_summary_empty}")

    # Test with invalid JSON
    print("\nTesting with invalid JSON:")
    invalid_json = "this is not json"
    monthly_summary_invalid = analyze_flix_prices(invalid_json)
    if not monthly_summary_invalid:
        print("  Correctly handled invalid JSON.")
    else:
        print(f"  Error: Expected empty list for invalid JSON, got: {monthly_summary_invalid}")
    
    # Test with data completely outside the range
    print("\nTesting with data completely outside the specified range:")
    outside_range_data = {
        "prices": [
            [1672531200000, 0.05], # Jan 1, 2023
            [1675209600000, 0.06], # Feb 1, 2023
            [1748908800000, 0.25], # May 31, 2025
            [1751500800000, 0.26]  # June 30, 2025
        ]
    }
    outside_range_json = json.dumps(outside_range_data)
    monthly_summary_outside = analyze_flix_prices(outside_range_json)
    if not monthly_summary_outside:
        print("  Correctly returned empty list for data completely outside range.")
    else:
        print(f"  Error: Expected empty list, got: {monthly_summary_outside}")

    print("\nFLIX price analysis finished.")
