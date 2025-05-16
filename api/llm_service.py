import os
import requests
import json
import time

class GroqAPI:
    def __init__(self):
        # Try both API keys, use the first one that works
        self.api_keys = [
            "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",
            "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"
        ]
        self.base_url = "https://api.groq.com/openai/v1"
        self.model = "llama-3.3-70b-versatile"
        self.default_timeout = (20, 20) # (connect_timeout, read_timeout) in seconds
        
    def _make_request(self, endpoint, payload, api_key_index=0):
        """Make a request to the Groq API with retry logic for API keys and timeout"""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_keys[api_key_index]}"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/{endpoint}",
                headers=headers,
                json=payload,
                timeout=self.default_timeout
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401 and api_key_index < len(self.api_keys) - 1:
                # Try the next API key
                print(f"API key {api_key_index+1} failed. Trying next key...")
                return self._make_request(endpoint, payload, api_key_index + 1)
            else:
                print(f"API request failed: {response.status_code} - {response.text}")
                return {"error": response.text, "status_code": response.status_code}
                
        except requests.exceptions.Timeout:
            print(f"API request timed out after {self.default_timeout} seconds.")
            if api_key_index < len(self.api_keys) - 1:
                print(f"Trying next API key...")
                return self._make_request(endpoint, payload, api_key_index + 1)
            else:
                return {"error": "API request timed out", "status_code": 408}
        except requests.exceptions.RequestException as e:
            print(f"Error making API request: {str(e)}")
            if api_key_index < len(self.api_keys) - 1:
                # Try the next API key
                print(f"Trying next API key...")
                return self._make_request(endpoint, payload, api_key_index + 1)
            else:
                return {"error": str(e), "status_code": 500} # Generic server error for other request exceptions
    
    def get_food_attributes(self, food_name):
        """Get food attributes from the LLM, including corrected food name"""
        prompt = f"""
        You are a nutritional expert. I need detailed information about {food_name}.
        Please provide the following attributes for this food in JSON format.
        
        IMPORTANT: First determine if this is actually a food item that humans typically eat. 
        If it's not a food item (like "keyboard", "book", "car", etc.), set "is_non_edible" to true.
        
        If the user has a non-standard name, provide the standard name in the food_name field.

        1. is_non_edible (boolean, set to true if this is not a food item that humans eat)
        2. food_name (the correct standard name for this food, fixing any spelling mistakes)
        3. food_category (e.g., Fruits, Vegetables, Grains, Proteins, Dairy, Nuts & Seeds, Beverages, etc.)
        4. food_subcategory (more specific category, e.g., Berries, Leafy Greens, Whole Grains, etc.)
        5. processing_level (Natural, Minimally Processed, Processed, Ultra-Processed)
        6. caffeine_content_mg (numeric value, 0 if none)
        7. flavor_profile (Sweet, Sour, Bitter, Spicy, Neutral, etc.)
        8. common_allergens (None, Dairy, Nuts, Gluten, Eggs, Soy, etc. - choose the most relevant or None)
        9. glycemic_index (numeric value between 0-100)
        10. inflammatory_index (numeric value between 1-10, where 1 is anti-inflammatory and 10 is highly inflammatory)
        11. calories_kcal (numeric value per 100g)
        
        Return only the JSON object with these attributes, nothing else.
        """

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a precise nutritional database that returns only JSON data for foods."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 500
        }
        
        response = self._make_request("chat/completions", payload)
        
        if "error" in response:
            print(f"Groq API error for get_food_attributes: {response.get('error')}, status: {response.get('status_code')}")
            # Return default values if API fails
            return self._get_default_food_attributes(food_name)
        
        try:
            content = response["choices"][0]["message"]["content"]
            # Extract JSON object from the response
            json_str = content
            if "```json" in content:
                json_str = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                json_str = content.split("```")[1].split("```")[0].strip()
            
            attributes = json.loads(json_str)
            
            # Check if this is a non-edible item
            if attributes.get('is_non_edible', False) == True:
                # Return a simplified structure for non-edible items
                return {
                    "name": food_name,
                    "category": "None",
                    "subcategory": "None",
                    "processing_level": "None",
                    "calories": "Unknown",
                    "glycemic_index": "Unknown",
                    "inflammatory_index": "1/10",
                    "allergens": "None",
                    "is_non_edible": True
                }
            
            # For regular food items, use the original name provided by the user
            attributes["food_name"] = food_name
            return attributes
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            print(f"Error parsing LLM response for get_food_attributes: {str(e)}")
            print(f"Raw response: {response}")
            # Return default values if parsing fails
            return self._get_default_food_attributes(food_name)
    
    def _get_default_food_attributes(self, food_name):
        """Return default values if the API fails"""
        return {
            "food_name": food_name,
            "food_category": "Unspecified",
            "food_subcategory": "Unspecified",
            "processing_level": "Natural",
            "caffeine_content_mg": 0,
            "flavor_profile": "Neutral",
            "common_allergens": "None",
            "glycemic_index": 50,
            "inflammatory_index": 5,
            "calories_kcal": 100,
            "is_non_edible": False
        }
    
    def chat(self, message, conversation_history=None):
        """General chat functionality"""
        if conversation_history is None:
            conversation_history = []
            
        messages = [
            {"role": "system", "content": "You are a helpful nutrition assistant specialized in women's health and menstruation. Be concise, informative, and supportive."}
        ] + conversation_history + [
            {"role": "user", "content": message}
        ]
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 800
        }
        
        response = self._make_request("chat/completions", payload)
        
        if "error" in response:
            print(f"Groq API error for chat: {response.get('error')}, status: {response.get('status_code')}")
            return "I'm having trouble connecting to my knowledge base right now. Please try again later."
        
        try:
            return response["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            print(f"Error parsing chat response: {str(e)}")
            return "I'm having trouble generating a response right now. Please try again."
