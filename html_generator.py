import datetime

def get_month_name(month_number):
    """Converts a month number to its full name."""
    return datetime.date(1900, month_number, 1).strftime('%B')

def generate_html_table(data):
    """
    Generates an HTML table string from a list of dictionaries
    containing monthly crypto data.

    Args:
        data (list): A list of dictionaries, where each dictionary has
                     'year', 'month', 'high_price', and 'low_price'.

    Returns:
        str: A string containing the HTML table.
    """
    if not data:
        return "<p>No data provided to generate table.</p>"

    html_string = "<table>\n"
    html_string += "  <thead>\n"
    html_string += "    <tr>\n"
    html_string += "      <th>Year</th>\n"
    html_string += "      <th>Month</th>\n"
    html_string += "      <th>High Price (USD)</th>\n"
    html_string += "      <th>Low Price (USD)</th>\n"
    html_string += "    </tr>\n"
    html_string += "  </thead>\n"
    html_string += "  <tbody>\n"

    for row_data in data:
        year = row_data.get('year', 'N/A')
        month_num = row_data.get('month', 0)
        high_price = row_data.get('high_price', 0.0)
        low_price = row_data.get('low_price', 0.0)

        month_name = "Invalid Month"
        if 1 <= month_num <= 12:
            month_name = get_month_name(month_num)
        
        html_string += "    <tr>\n"
        html_string += f"      <td>{year}</td>\n"
        html_string += f"      <td>{month_name}</td>\n"
        html_string += f"      <td>{high_price:.4f}</td>\n"
        html_string += f"      <td>{low_price:.4f}</td>\n"
        html_string += "    </tr>\n"

    html_string += "  </tbody>\n"
    html_string += "</table>"
    
    return html_string

# Example input data
sample_monthly_data = [
    { "year": 2023, "month": 5, "high_price": 0.12, "low_price": 0.09 },
    { "year": 2023, "month": 6, "high_price": 0.15, "low_price": 0.11 },
    { "year": 2024, "month": 1, "high_price": 0.20, "low_price": 0.18 },
    { "year": 2023, "month": 12, "high_price": 0.12345, "low_price": 0.08765 } # Test decimal formatting
]

if __name__ == "__main__":
    print("Generating HTML table from sample data...")
    html_output = generate_html_table(sample_monthly_data)
    print("\n--- HTML Output ---")
    print(html_output)

    print("\nGenerating HTML table from empty data...")
    html_output_empty = generate_html_table([])
    print("\n--- HTML Output (Empty Data) ---")
    print(html_output_empty)

    print("\nGenerating HTML table from data with missing keys (should use defaults/handle gracefully)...")
    sample_missing_keys_data = [
        { "year": 2023, "month": 5, "high_price": 0.12, "low_price": 0.09 },
        { "year": 2024, "high_price": 0.20 }, # Missing month and low_price
        { "month": 7, "low_price": 0.10 }  # Missing year and high_price
    ]
    html_output_missing_keys = generate_html_table(sample_missing_keys_data)
    print("\n--- HTML Output (Missing Keys) ---")
    print(html_output_missing_keys)

    print("\nGenerating HTML table from data with invalid month...")
    sample_invalid_month_data = [
        { "year": 2023, "month": 13, "high_price": 0.12, "low_price": 0.09 },
        { "year": 2023, "month": 0, "high_price": 0.15, "low_price": 0.11 },
    ]
    html_output_invalid_month = generate_html_table(sample_invalid_month_data)
    print("\n--- HTML Output (Invalid Month) ---")
    print(html_output_invalid_month)
    print("\nHTML generation tests finished.")
