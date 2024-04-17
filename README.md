# VGSAssignment
Assignment for VGS


# Bob's Hamburgers Payment System Demo

This repository contains a demo application for Bob's Hamburgers, a fictional burger shop, showcasing the use of Very Good Security (VGS) proxies for secure credit card data handling and payment processing using Stripe.

## Introduction

The application simulates a credit card collection and payment process using VGS Inbound and Outbound proxies. It demonstrates how businesses like Bob's Hamburgers can securely tokenize credit card data before it touches their servers and safely transmit tokenized data to payment processors such as Stripe.

### How It Works

- **VGS Inbound Proxy**: Collects and tokenizes credit card data from the frontend.
- **VGS Outbound Proxy**: Reveals tokenized data to Stripe for payment processing.

## Project Structure

- `VGSLocalFrontEnd`: Contains the frontend interface where customers can enter their payment details.
- `VGSLocalBackEnd`: Hosts the server logic for handling API requests, interacting with VGS proxies, and processing payments via Stripe.

## Requirements

- Node.js
- Access to a VGS sandbox environment
- Stripe account for payment processing

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Raghavd609/VGSAssignment.git
2. Install dependencies:
    cd VGSLocalBackEnd
    npm install

3.Configure Environment Variables: 
Located in the config.json
   

