// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const foodInput = document.getElementById('food-input');
    const predictBtn = document.getElementById('predict-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const predictBtnText = document.getElementById('predict-btn-text');
    const predictionResults = document.getElementById('prediction-results');
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');
    const chatMessages = document.getElementById('chat-messages');
    const historyList = document.getElementById('history-list');
    const noHistory = document.getElementById('no-history');
    const chatHistoryList = document.getElementById('chat-history-list');
    const noChatHistory = document.getElementById('no-chat-history');
    const feedbackText = document.getElementById('feedback-text');
    const sendFeedbackBtn = document.getElementById('send-feedback-btn');
    const themeToggle = document.getElementById('theme-toggle');
    
    // Auth elements
    const authStatusLoggedOut = document.getElementById('auth-status-logged-out');
    const authStatusLoggedIn = document.getElementById('auth-status-logged-in');
    const welcomeUser = document.getElementById('welcome-user');
    const logoutBtn = document.getElementById('logout-btn');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');

    // Bootstrap modals
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
    
    // Initialize theme from localStorage
    initializeTheme();
    
    // Initialize section visibility - FIXED to use display block/none directly
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(section => {
        if (section.id === 'hero-section') {
            section.style.display = 'block';
            section.classList.add('active-section');
        } else {
            section.style.display = 'none';
            section.classList.remove('active-section');
        }
    });

    // Check authentication status
    checkAuth();
    
    // Check for active notification
    checkNotification();

    // Navigation handling with section visibility and animations - FIXED
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');

            // Prevent navigation for empty hash links like href="#"
            if (targetId === '#' || targetId.trim() === '') {
                return;
            }

            const targetElement = document.querySelector(targetId);
            
            console.log("Clicked on link to:", targetId);
            console.log("Target element exists:", !!targetElement);
            
            if (targetElement) {
                // Hide all sections
                sections.forEach(section => {
                    section.style.display = 'none';
                    section.classList.remove('active-section');
                    console.log("Hiding section:", section.id);
                });

                // Remove all animation classes
                targetElement.classList.remove('animate__fadeIn', 'animate__fadeInUp', 'animate__fadeInLeft', 'animate__fadeInRight');
                
                // Add appropriate animation class based on section
                let animationClass = 'animate__fadeIn';
                switch(targetId) {
                    case '#predictor':
                        animationClass = 'animate__fadeInRight';
                        break;
                    case '#chatbot':
                        animationClass = 'animate__fadeInUp';
                        break;
                    case '#history':
                        animationClass = 'animate__fadeInLeft';
                        break;
                    case '#about':
                        animationClass = 'animate__fadeInUp';
                        break;
                }
                
                targetElement.classList.add(animationClass);
                console.log("Added animation class to:", targetId, animationClass);

                // Show the target section
                targetElement.style.display = 'block';
                targetElement.classList.add('active-section');
                console.log("Made section visible:", targetId);
                
                // Smooth scroll to the section with improved positioning
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
                
                // Update active nav item
                document.querySelectorAll('.main-nav a').forEach(navItem => {
                    navItem.classList.remove('active');
                });
                this.classList.add('active');
            } else {
                console.error("Could not find target element:", targetId);
            }
        });
    });

    // Handle Get Started button click with animation - FIXED
    const getStartedBtn = document.querySelector('.hero-section .btn-primary');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const predictorSection = document.getElementById('predictor');
            const heroSection = document.getElementById('hero-section');
            
            if (predictorSection) {
                // Hide all sections
                sections.forEach(section => {
                    section.style.display = 'none';
                    section.classList.remove('active-section');
                });

                // Prepare animation
                predictorSection.classList.remove('animate__fadeIn', 'animate__fadeInUp', 'animate__fadeInLeft', 'animate__fadeInRight');
                predictorSection.classList.add('animate__fadeInUp');

                // Show the predictor section
                predictorSection.style.display = 'block';
                predictorSection.classList.add('active-section');

                // Smooth scroll to the section
                window.scrollTo({
                    top: predictorSection.offsetTop - 100,
                    behavior: 'smooth'
                });

                // Update active nav item
                document.querySelectorAll('.main-nav a').forEach(navItem => {
                    navItem.classList.remove('active');
                });
                document.querySelector('.main-nav a[href="#predictor"]').classList.add('active');
            }
        });
    }
    
    // Food prediction
    if (predictBtn) {
        predictBtn.addEventListener('click', function() {
            predictFood();
        });
    }
    
    if (foodInput) {
        foodInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                predictFood();
            }
        });
    }
    
    function predictFood() {
        const foodName = foodInput.value.trim();
        const quantity = "100g/100ml"; // Default quantity
        
        if (!foodName) {
            showToast('Please enter a food name', 'warning');
            return;
        }
        
        // Show loading state
        loadingSpinner.classList.remove('d-none');
        predictBtnText.textContent = 'Analyzing...';
        predictBtn.disabled = true;
        
        console.log("Making prediction request for food:", foodName, "quantity:", quantity);
        
        // Make API request
        fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                food_name: foodName,
                quantity: quantity
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log("Prediction data received:", data);
            
            // Reset button state
            loadingSpinner.classList.add('d-none');
            predictBtnText.textContent = 'Predict';
            predictBtn.disabled = false;
            
            // Add quantity to the data if not already there
            if (data.food_data && !data.food_data.quantity) {
                data.food_data.quantity = quantity;
            }
            
            // Additional spelling correction for common foods
            const spellingCorrections = {
               
                'bna': 'dna'
            };
            
            // Apply manual corrections if the AI didn't fix it properly
            if (spellingCorrections[foodName.toLowerCase()]) {
                foodName = spellingCorrections[foodName.toLowerCase()];
                console.log("Manual correction applied: ", foodName);
                // Update the food name in the data object to ensure consistency
                data.food_data.food_name = foodName;
            }
            
            // Display results - AI-corrected food name will be shown from data.food_data.food_name
            displayPredictionResults(data);
            
            // Refresh history
            fetchHistory();
        })
        .catch(error => {
            console.error('Error:', error);
            loadingSpinner.classList.add('d-none');
            predictBtnText.textContent = 'Predict';
            predictBtn.disabled = false;
            showToast('Error: ' + error.message, 'error');
        });
    }
    
    function displayPredictionResults(data) {
        try {
            console.log("Displaying prediction results:", data);
            
            // Check if this is a non-edible item response
            if (data.non_edible_message || (data.food_data && data.food_data.is_non_edible)) {
                // Show non-edible item message
                const foodData = data.food_data;
                let foodName = foodData.name || "Unknown Item";
                const quantity = foodData.quantity || "100g/100ml";
                
                // Format as "Item Name 100g/100ml"
                document.getElementById('result-food-name-with-quantity').textContent = `${foodName} ${quantity}`;
                document.getElementById('result-food-category').textContent = foodData.category || "None";
                document.getElementById('result-category').textContent = foodData.category || "None";
                document.getElementById('result-subcategory').textContent = foodData.subcategory || "None";
                document.getElementById('result-processing').textContent = foodData.processing_level || "None";
                document.getElementById('result-calories').textContent = foodData.calories || "Unknown";
                document.getElementById('result-glycemic').textContent = foodData.glycemic_index || "Unknown";
                document.getElementById('result-inflammatory').textContent = foodData.inflammatory_index || "1/10";
                document.getElementById('result-allergens').textContent = foodData.allergens || "None";
                
                // For non-edible items, set all impacts to neutral
                const impactIds = [
                    'impact-cramps', 'impact-bloating', 'impact-headache',
                    'impact-mood', 'impact-fatigue', 'impact-acne'
                ];
                
                impactIds.forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = "N/A";
                        element.classList.remove('beneficial', 'harmful');
                        element.classList.add('neutral');
                    }
                });
                
                // Show non-edible message as a toast
                if (data.non_edible_message) {
                    showToast(data.non_edible_message, 'warning');
                } else {
                    showToast(`${foodName} is not a food item. Please enter a valid food name.`, 'warning');
                }
                
                // Show results with animation
                const resultsElement = document.getElementById('prediction-results');
                resultsElement.classList.remove('d-none');
                resultsElement.classList.add('animate__animated', 'animate__fadeIn');
                
                // Hide the AI explanation section for non-edible items
                document.getElementById('ai-explanation-section').classList.add('d-none');
                
                return;
            }
            
            // Ensure we have the necessary data for regular food items
            if (!data || !data.food_data || !data.prediction_results) {
                console.error("Invalid prediction data format:", data);
                showToast("Error: Invalid prediction data received", "error");
                return;
            }
            
            // Safely set food information with fallbacks
            const foodData = data.food_data;
            let foodName = foodData.food_name || "Unknown Food";
            
            // Additional spelling correction for common foods
            const spellingCorrections = {
                'bna': 'dna'
            };
            
            // Apply manual corrections if the AI didn't fix it properly
            if (spellingCorrections[foodName.toLowerCase()]) {
                foodName = spellingCorrections[foodName.toLowerCase()];
                console.log("Manual correction applied: ", foodName);
                // Update the food name in the data object to ensure consistency
                data.food_data.food_name = foodName;
            }
            
            const quantity = foodData.quantity || "100g/100ml";
            
            console.log("Corrected food name from AI:", foodName);
            console.log("Original input field value:", foodInput.value);
            
            // Force update input field with corrected name from AI
            setTimeout(() => {
                foodInput.value = foodName;
                console.log("Input field updated to:", foodInput.value);
            }, 100);
            
            // Format as "Food Name 100g/100ml"
            document.getElementById('result-food-name-with-quantity').textContent = `${foodName} ${quantity}`;
            document.getElementById('result-food-category').textContent = foodData.food_category || "Unknown";
            document.getElementById('result-category').textContent = foodData.food_category || "Unknown";
            document.getElementById('result-subcategory').textContent = foodData.food_subcategory || "Unknown";
            document.getElementById('result-processing').textContent = foodData.processing_level || "Unknown";
            document.getElementById('result-calories').textContent = (foodData.calories_kcal ? foodData.calories_kcal + ' kcal' : "Unknown");
            document.getElementById('result-glycemic').textContent = foodData.glycemic_index || "Unknown";
            document.getElementById('result-inflammatory').textContent = (foodData.inflammatory_index ? foodData.inflammatory_index + '/10' : "Unknown");
            document.getElementById('result-allergens').textContent = foodData.common_allergens || "None";
            
            // Fill in impact values with color-coding
            const predictions = data.prediction_results;
            const impacts = {
                'impact-cramps': predictions.impact_on_cramps,
                'impact-bloating': predictions.impact_on_bloating,
                'impact-headache': predictions.impact_on_headache,
                'impact-mood': predictions.impact_on_mood_swings,
                'impact-fatigue': predictions.impact_on_fatigue,
                'impact-acne': predictions.impact_on_acne
            };
            
            for (const [elementId, value] of Object.entries(impacts)) {
                const element = document.getElementById(elementId);
                if (!element) {
                    console.warn(`Element with ID ${elementId} not found`);
                    continue;
                }
                
                element.textContent = value || "Neutral";
                
                // Remove existing classes
                element.classList.remove('beneficial', 'harmful', 'neutral');
                
                // Add appropriate class
                if (!value) {
                    element.classList.add('neutral');
                } else if (value === 'Beneficial') {
                    element.classList.add('beneficial');
                } else if (value === 'Harmful') {
                    element.classList.add('harmful');
                } else {
                    element.classList.add('neutral');
                }
            }
            
            // Show results with animation
            const resultsElement = document.getElementById('prediction-results');
            resultsElement.classList.remove('d-none');
            resultsElement.classList.add('animate__animated', 'animate__fadeIn');
            
            // Scroll to results
            resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Remove animation class after animation completes
            setTimeout(() => {
                resultsElement.classList.remove('animate__animated', 'animate__fadeIn');
            }, 1000);
            
            // Also show the explanation section
            document.getElementById('ai-explanation-section').classList.remove('d-none');
        } catch (error) {
            console.error("Error displaying prediction results:", error);
            showToast("Error displaying prediction results", "error");
        }
    }
    
    // Chatbot functionality
    if (sendChatBtn) {
        sendChatBtn.addEventListener('click', function() {
            sendChatMessage();
        });
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
    
    function sendChatMessage() {
        const message = chatInput.value.trim();
        
        if (!message) {
            return;
        }
        
        // Add user message to chat
        addChatMessage(message, 'user');
        
        // Clear input
        chatInput.value = '';
        
        // Add typing indicator
        const typingIndicator = addTypingIndicator();
        
        // Send message to API
        fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            // Remove typing indicator
            typingIndicator.remove();
            
            // Add bot response
            if (data.response) {
                addChatMessage(data.response, 'bot');
            } else if (data.error) {
                addChatMessage('Sorry, I encountered an error: ' + data.error, 'bot');
            }
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Refresh chat history
            fetchChatHistory();
        })
        .catch(error => {
            console.error('Error:', error);
            typingIndicator.remove();
            addChatMessage('Sorry, I encountered an error. Please try again later.', 'bot');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }
    
    function addChatMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}-message animate__animated animate__fadeIn`;
        
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        
        const textElement = document.createElement('p');
        textElement.textContent = message;
        
        contentElement.appendChild(textElement);
        messageElement.appendChild(contentElement);
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Remove animation class after animation completes
        setTimeout(() => {
            messageElement.classList.remove('animate__animated', 'animate__fadeIn');
        }, 1000);
    }
    
    function addTypingIndicator() {
        const typingElement = document.createElement('div');
        typingElement.className = 'message bot-message typing-indicator animate__animated animate__fadeIn';
        
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        
        const dotsElement = document.createElement('div');
        dotsElement.className = 'typing-dots';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dot.className = 'dot';
            dotsElement.appendChild(dot);
        }
        
        contentElement.appendChild(dotsElement);
        typingElement.appendChild(contentElement);
        
        chatMessages.appendChild(typingElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return typingElement;
    }
    
    // Fetch prediction history
    function fetchHistory() {
        fetch('/history')
            .then(response => response.json())
            .then(data => {
                console.log("History data received:", data);
                if (data.history && data.history.length > 0) {
                    displayHistory(data.history);
                    noHistory.style.display = 'none';
                } else {
                    noHistory.style.display = 'block';
                    historyList.innerHTML = '';
                    historyList.appendChild(noHistory);
                }
            })
            .catch(error => {
                console.error('Error fetching history:', error);
                showToast('Error loading history', 'error');
            });
    }
    
    // Fetch chat history
    function fetchChatHistory() {
        fetch('/chat-history')
            .then(response => response.json())
            .then(data => {
                console.log("Chat history data received:", data);
                if (data.history && data.history.length > 0) {
                    displayChatHistory(data.history);
                    noChatHistory.style.display = 'none';
                } else {
                    noChatHistory.style.display = 'block';
                    chatHistoryList.innerHTML = '';
                    chatHistoryList.appendChild(noChatHistory);
                }
            })
            .catch(error => {
                console.error('Error fetching chat history:', error);
                showToast('Error loading chat history', 'error');
            });
    }
    
    function displayHistory(historyItems) {
        // Clear existing content
        historyList.innerHTML = '';
        
        console.log("Displaying history items:", historyItems.length);
        
        // Hide no-history message
        if (noHistory) {
            noHistory.style.display = 'none';
        }
        
        // Add each history item
        historyItems.forEach((item, index) => {
            console.log(`Processing history item ${index}:`, item);
            
            try {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item animate__animated animate__fadeIn';
                
                const header = document.createElement('div');
                header.className = 'history-item-header';
                
                const foodName = document.createElement('h3');
                foodName.textContent = item.food_name || "Unknown Food";
                
                const timestamp = document.createElement('span');
                timestamp.className = 'timestamp';
                timestamp.textContent = formatDate(item.timestamp);
                
                header.appendChild(foodName);
                header.appendChild(timestamp);
                
                const impactSummary = document.createElement('div');
                impactSummary.className = 'impact-summary';
                
                // Add impact summaries if results exist
                if (item.results && typeof item.results === 'object') {
                    Object.entries(item.results).forEach(([symptom, impact]) => {
                        const impactItem = document.createElement('div');
                        const impactClass = impact ? impact.toLowerCase() : 'neutral';
                        impactItem.className = `impact-badge ${impactClass}`;
                        
                        // Format symptom name
                        const symptomName = symptom.replace('impact_on_', '').replace('_', ' ');
                        impactItem.textContent = `${symptomName.charAt(0).toUpperCase() + symptomName.slice(1)}: ${impact || 'Neutral'}`;
                        
                        impactSummary.appendChild(impactItem);
                    });
                } else {
                    console.warn(`Item ${index} has invalid results:`, item.results);
                    const errorItem = document.createElement('div');
                    errorItem.className = 'impact-badge neutral';
                    errorItem.textContent = "No impact data available";
                    impactSummary.appendChild(errorItem);
                }
                
                historyItem.appendChild(header);
                historyItem.appendChild(impactSummary);
                
                historyList.appendChild(historyItem);
                
                // Remove animation class after animation completes
                setTimeout(() => {
                    historyItem.classList.remove('animate__animated', 'animate__fadeIn');
                }, 1000);
            } catch (error) {
                console.error("Error displaying history item:", error, item);
            }
        });
    }
    
    function displayChatHistory(historyItems) {
        // Clear existing content
        chatHistoryList.innerHTML = '';
        
        console.log("Displaying chat history items:", historyItems.length);
        
        // Hide no-history message
        if (noChatHistory) {
            noChatHistory.style.display = 'none';
        }
        
        // Add each history item
        historyItems.forEach((item, index) => {
            console.log(`Processing chat history item ${index}:`, item);
            
            try {
                const historyItem = document.createElement('div');
                historyItem.className = 'chat-history-item animate__animated animate__fadeIn';
                
                const timestamp = document.createElement('div');
                timestamp.className = 'timestamp';
                timestamp.textContent = formatDate(item.timestamp);
                
                const userMessage = document.createElement('div');
                userMessage.className = 'user-message';
                userMessage.textContent = item.user_message || "No user message";
                
                const botMessage = document.createElement('div');
                botMessage.className = 'bot-message';
                botMessage.textContent = item.bot_response || "No response";
                
                historyItem.appendChild(timestamp);
                historyItem.appendChild(userMessage);
                historyItem.appendChild(botMessage);
                
                chatHistoryList.appendChild(historyItem);
                
                // Remove animation class after animation completes
                setTimeout(() => {
                    historyItem.classList.remove('animate__animated', 'animate__fadeIn');
                }, 1000);
            } catch (error) {
                console.error("Error displaying chat history item:", error, item);
            }
        });
    }
    
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }
    
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type} animate__animated animate__fadeIn`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('animate__fadeIn');
            toast.classList.add('animate__fadeOut');
            
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 500);
        }, 3000);
    }
    
    // Authentication functions
    function checkAuth() {
        fetch('/check-auth')
            .then(response => response.json())
            .then(data => {
                if (data.authenticated) {
                    // User is logged in
                    authStatusLoggedOut.classList.remove('active');
                    authStatusLoggedOut.classList.add('d-none');
                    authStatusLoggedIn.classList.add('active');
                    authStatusLoggedIn.classList.remove('d-none');
                    welcomeUser.textContent = ` ${data.username}`;
                    
                    // Check if admin and update UI accordingly
                    if (data.is_admin) {
                        showAdminPanel();
                    } else {
                        hideAdminPanel();
                    }
                    
                    // Fetch user-specific data
                    fetchHistory();
                    fetchChatHistory();
                } else {
                    // User is not logged in
                    authStatusLoggedOut.classList.add('active');
                    authStatusLoggedOut.classList.remove('d-none');
                    authStatusLoggedIn.classList.remove('active');
                    authStatusLoggedIn.classList.add('d-none');
                    
                    // Hide admin panel
                    hideAdminPanel();
                    
                    // Fetch session-based data
                    fetchHistory();
                    fetchChatHistory();
                }
            })
            .catch(error => {
                console.error('Auth check error:', error);
                showToast('Error checking authentication status', 'error');
            });
    }
    
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value.trim();
            
            if (!username || !password) {
                showLoginError('Username and password are required');
                return;
            }
            
            fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Login successful
                    loginModal.hide();
                    showToast(`Welcome back, ${data.username}!`, 'success');
                    checkAuth();
                    loginForm.reset();
                    hideLoginError();
                    
                    // If admin, show admin panel
                    if (data.is_admin) {
                        showAdminPanel();
                    }
                } else {
                    // Login failed
                    showLoginError(data.error || 'Login failed');
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                showLoginError('An error occurred. Please try again.');
            });
        });
    }
    
    // Register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('register-username').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value.trim();
            const confirmPassword = document.getElementById('register-confirm-password').value.trim();
            
            if (!username || !email || !password || !confirmPassword) {
                showRegisterError('All fields are required');
                return;
            }
            
            if (password !== confirmPassword) {
                showRegisterError('Passwords do not match');
                return;
            }
            
            fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Registration successful
                    registerModal.hide();
                    showToast(`Welcome, ${data.username}! Your account has been created.`, 'success');
                    checkAuth();
                    registerForm.reset();
                    hideRegisterError();
                } else {
                    // Registration failed
                    showRegisterError(data.error || 'Registration failed');
                }
            })
            .catch(error => {
                console.error('Registration error:', error);
                showRegisterError('An error occurred. Please try again.');
            });
        });
    }
    
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            fetch('/logout', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('You have been logged out', 'info');
                    checkAuth();
                }
            })
            .catch(error => {
                console.error('Logout error:', error);
                showToast('Error logging out', 'error');
            });
        });
    }
    
    // Switch between login and register modals
    if (switchToRegister) {
        switchToRegister.addEventListener('click', function(e) {
            e.preventDefault();
            loginModal.hide();
            setTimeout(() => {
                registerModal.show();
                // Set focus to the first input field in the register form
                setTimeout(() => {
                    document.getElementById('register-username')?.focus();
                }, 100);
            }, 500);
        });
    }
    
    if (switchToLogin) {
        switchToLogin.addEventListener('click', function(e) {
            e.preventDefault();
            registerModal.hide();
            setTimeout(() => {
                loginModal.show();
                // Set focus to the first input field in the login form
                setTimeout(() => {
                    document.getElementById('login-username')?.focus();
                }, 100);
            }, 500);
        });
    }
    
    // Additional focus management for modals
    document.addEventListener('shown.bs.modal', function(event) {
        // When a modal is shown, set focus to the first input or button
        const modal = event.target;
        
        // Don't interfere with notification modal which has its own focus management
        if (modal.id === 'notificationModal') {
            return;
        }
        
        // First try to find an input element
        const firstInput = modal.querySelector('input');
        if (firstInput) {
            firstInput.focus();
            return;
        }
        
        // If no input, try finding a button
        const firstButton = modal.querySelector('button:not(.btn-close)');
        if (firstButton) {
            firstButton.focus();
        }
    });
    
    // When modal is hidden, return focus to the element that opened it
    document.addEventListener('hidden.bs.modal', function(event) {
        // Find the element that triggered the modal
        const modalId = event.target.id;
        let triggerElement;
        
        if (modalId === 'loginModal') {
            triggerElement = document.getElementById('login-btn');
        } else if (modalId === 'registerModal') {
            triggerElement = document.getElementById('register-btn');
        }
        
        // Return focus to trigger element if found
        if (triggerElement) {
            triggerElement.focus();
        }
    });
    
    // Handle login form open from nav
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            // When login modal is opened, we need to ensure focus is correctly set
            setTimeout(() => {
                const loginUsername = document.getElementById('login-username');
                if (loginUsername) {
                    loginUsername.focus();
                }
            }, 500);
        });
    }
    
    // Handle register form open from nav
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', function() {
            // When register modal is opened, we need to ensure focus is correctly set
            setTimeout(() => {
                const registerUsername = document.getElementById('register-username');
                if (registerUsername) {
                    registerUsername.focus();
                }
            }, 500);
        });
    }
    
    function showLoginError(message) {
        loginError.textContent = message;
        loginError.classList.remove('d-none');
    }
    
    function hideLoginError() {
        loginError.classList.add('d-none');
    }
    
    function showRegisterError(message) {
        registerError.textContent = message;
        registerError.classList.remove('d-none');
    }
    
    function hideRegisterError() {
        registerError.classList.add('d-none');
    }
    
    // Add clear history functionality
    const clearPredictionsBtn = document.getElementById('clear-predictions');
    const clearChatsBtn = document.getElementById('clear-chats');

    if (clearPredictionsBtn) {
        clearPredictionsBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to clear your prediction history?')) {
                clearPredictionHistory();
            }
        });
    }

    if (clearChatsBtn) {
        clearChatsBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to clear your chat history?')) {
                clearChatHistory();
            }
        });
    }

    function clearPredictionHistory() {
        fetch('/clear-predictions', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Prediction history cleared', 'success');
                // Clear the display
                historyList.innerHTML = '';
                historyList.appendChild(noHistory);
                noHistory.style.display = 'block';
            } else {
                showToast('Error clearing history', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error clearing history', 'error');
        });
    }

    function clearChatHistory() {
        fetch('/clear-chats', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Chat history cleared', 'success');
                // Clear the display
                chatHistoryList.innerHTML = '';
                chatHistoryList.appendChild(noChatHistory);
                noChatHistory.style.display = 'block';
            } else {
                showToast('Error clearing chat history', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error clearing chat history', 'error');
        });
    }
    
    // Initialize
    fetchHistory();
    fetchChatHistory();
    fetchVisitorCount();

    // Function to fetch visitor count
    function fetchVisitorCount() {
        fetch('/visitor-count')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const visitorCount = document.getElementById('visitor-count');
                    if (visitorCount) {
                        visitorCount.textContent = data.count.toLocaleString();
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching visitor count:', error);
                const visitorCount = document.getElementById('visitor-count');
                if (visitorCount) {
                    visitorCount.textContent = 'Error loading count';
                }
            });
    }

    // Keep only this fully-featured event listener for the explain button
    document.getElementById('explain-btn').addEventListener('click', function() {
        console.log("Explain button clicked");
        const explainBtn = document.getElementById('explain-btn');
        const explanationContent = document.getElementById('explanation-content');
        const explanationPoints = document.querySelector('.explanation-points');
        
        // If already showing and clicking to hide, just toggle visibility
        if (explanationContent.classList.contains('active')) {
            console.log("Hiding explanation content");
            explanationContent.classList.remove('active');
            explainBtn.innerHTML = '<i class="fas fa-robot"></i> Get AI Explanation';
            return;
        }
        
        // Get the current food name
        const foodName = document.getElementById('result-food-name-with-quantity').textContent.split(' ')[0];
        console.log("Getting explanation for food:", foodName);
        
        // Show loading state
        explainBtn.disabled = true;
        explainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        
        // Clear and show loading message
        explanationPoints.innerHTML = '<li><i class="fas fa-spinner fa-spin"></i> AI is analyzing this food and its impacts...</li>';
        explanationContent.classList.add('active');
        
        // Create impacts object from the displayed values
        const impacts = {
            cramps: document.getElementById('impact-cramps').textContent,
            bloating: document.getElementById('impact-bloating').textContent,
            headache: document.getElementById('impact-headache').textContent,
            mood: document.getElementById('impact-mood').textContent,
            fatigue: document.getElementById('impact-fatigue').textContent,
            acne: document.getElementById('impact-acne').textContent
        };
        console.log("Impact values:", impacts);
        
        // Create food data object
        const foodData = {
            category: document.getElementById('result-category').textContent,
            subcategory: document.getElementById('result-subcategory').textContent,
            processing: document.getElementById('result-processing').textContent,
            calories: document.getElementById('result-calories').textContent,
            glycemic_index: document.getElementById('result-glycemic').textContent,
            inflammatory_index: document.getElementById('result-inflammatory').textContent,
            allergens: document.getElementById('result-allergens').textContent
        };
        console.log("Food data:", foodData);
        
        // Fetch explanation from API
        console.log("Sending API request to /explain-prediction");
        fetch('/explain-prediction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                food_name: foodName,
                impacts: impacts,
                food_data: foodData
            })
        })
        .then(response => {
            console.log("Received response from API, status:", response.status);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log("Parsed explanation data:", data);
            
            // Clear loading state
            explainBtn.disabled = false;
            explainBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Explanation';
            
            // Display the explanation
            if (data.explanation && Array.isArray(data.explanation)) {
                console.log("Displaying explanation array, length:", data.explanation.length);
                explanationPoints.innerHTML = '';
                data.explanation.forEach(point => {
                    const li = document.createElement('li');
                    li.textContent = point;
                    explanationPoints.appendChild(li);
                });
            } else if (data.explanation) {
                // If it's just a string, split by newlines
                console.log("Displaying explanation string");
                explanationPoints.innerHTML = '';
                const points = data.explanation.split('\n').filter(p => p.trim().length > 0);
                points.forEach(point => {
                    const li = document.createElement('li');
                    li.textContent = point;
                    explanationPoints.appendChild(li);
                });
            } else {
                console.log("No explanation content found in data");
                explanationPoints.innerHTML = '<li>No detailed explanation available for this food.</li>';
            }
            
            // Add a slight animation effect to each list item
            document.querySelectorAll('.explanation-points li').forEach((li, index) => {
                li.style.opacity = '0';
                li.style.transform = 'translateY(10px)';
                li.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                
                setTimeout(() => {
                    li.style.opacity = '1';
                    li.style.transform = 'translateY(0)';
                }, 100 * index);
            });
        })
        .catch(error => {
            console.error('Error getting explanation:', error);
            
            // Show error in explanation
            explanationPoints.innerHTML = `
                <li>Sorry, I couldn't generate a detailed explanation at this time.</li>
                <li>Based on nutritional data, this food may impact your menstrual symptoms through its effects on inflammation, hormone balance, and blood sugar levels.</li>
                <li>Try again later for a more detailed AI analysis.</li>
            `;
            
            // Reset button
            explainBtn.disabled = false;
            explainBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Try Again';
        });
    });

    // Feedback form handling
    if (sendFeedbackBtn) {
        sendFeedbackBtn.addEventListener('click', function() {
            submitFeedback();
        });
    }
    
    if (feedbackText) {
        feedbackText.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                submitFeedback();
            }
        });
    }
    
    function submitFeedback() {
        const feedback = feedbackText.value.trim();
        
        if (!feedback) {
            showToast('Please enter some feedback', 'warning');
            return;
        }
        
        fetch('/submit-feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ feedback_text: feedback })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Thank you for your feedback!', 'success');
                feedbackText.value = '';
            } else {
                showToast(data.error || 'Failed to submit feedback', 'error');
            }
        })
        .catch(error => {
            console.error('Feedback error:', error);
            showToast('Error submitting feedback', 'error');
        });
    }
    
    // Check for notifications
    function checkNotification() {
        fetch('/get-active-notification')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.notification) {
                    showNotificationModal(data.notification.message);
                }
            })
            .catch(error => {
                console.error('Notification check error:', error);
            });
    }
    
    // Show notification modal
    function showNotificationModal(message) {
        // Create notification modal if it doesn't exist
        if (!document.getElementById('notificationModal')) {
            const modalHtml = `
                <div class="modal fade" id="notificationModal" tabindex="-1" aria-labelledby="notificationModalLabel" role="dialog">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="notificationModalLabel">Announcement</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <p id="notification-message"></p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Append modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Apply dark theme if active
            if (document.body.classList.contains('dark-theme')) {
                document.getElementById('notificationModal').classList.add('dark-theme');
            }
        }
        
        // Set notification message
        document.getElementById('notification-message').textContent = message;
        
        // Show notification modal
        const notificationModal = new bootstrap.Modal(document.getElementById('notificationModal'));
        notificationModal.show();
        
        // Set focus to close button after modal is shown
        document.getElementById('notificationModal').addEventListener('shown.bs.modal', function() {
            const closeButton = document.querySelector('#notificationModal .btn-primary');
            if (closeButton) {
                closeButton.focus();
            }
        }, { once: true });
    }
    
    // Admin panel functions
    function showAdminPanel() {
        // Create admin section if it doesn't exist
        if (!document.getElementById('admin-section')) {
            const adminSectionHtml = `
                <section id="admin-section" class="admin-section page-section animate__animated">
                    <div class="container">
                        <div class="section-header">
                            <h2>Admin Panel</h2>
                            <p>Manage notifications and view feedbacks</p>
                        </div>
                        
                        <div class="admin-container">
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h4>User Notifications</h4>
                                </div>
                                <div class="card-body">
                                    <form id="notification-form">
                                        <div class="form-group mb-3">
                                            <label for="notification-message">Notification Message</label>
                                            <textarea id="notification-message" class="form-control" rows="3" placeholder="Enter notification message"></textarea>
                                        </div>
                                        <div class="form-check mb-3">
                                            <input class="form-check-input" type="checkbox" id="notification-active" checked>
                                            <label class="form-check-label" for="notification-active">Active</label>
                                        </div>
                                        <button type="submit" class="btn btn-primary">Save Notification</button>
                                    </form>
                                </div>
                            </div>
                            
                            <div class="card">
                                <div class="card-header">
                                    <h4>User Feedbacks</h4>
                                </div>
                                <div class="card-body">
                                    <div id="feedbacks-list" class="feedbacks-list">
                                        <div class="no-feedbacks" id="no-feedbacks">
                                            <p>No feedbacks available yet.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            `;
            
            // Append admin section to main
            document.querySelector('.app-main').insertAdjacentHTML('beforeend', adminSectionHtml);
            
            // Add admin section to bottom nav
            const bottomNav = document.getElementById('bottom-nav');
            if (bottomNav) {
                const adminNavHtml = `
                    <div class="bottom-nav-item" data-section="admin-section">
                        <i class="fas fa-user-shield"></i>
                        <span>Admin</span>
                    </div>
                `;
                bottomNav.insertAdjacentHTML('beforeend', adminNavHtml);
                
                // Attach event listeners to the new nav item
                const adminNavItem = document.querySelector('.bottom-nav-item[data-section="admin-section"]');
                adminNavItem.addEventListener('click', function() {
                    // Hide all sections
                    sections.forEach(section => {
                        section.style.display = 'none';
                        section.classList.remove('active-section');
                    });
                    
                    // Show admin section
                    const adminSection = document.getElementById('admin-section');
                    adminSection.style.display = 'block';
                    adminSection.classList.add('active-section');
                    
                    // Update active nav item
                    document.querySelectorAll('.bottom-nav-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    this.classList.add('active');
                });
            }
            
            // Ensure dark theme is applied to admin panel if it's currently active
            const body = document.body;
            if (body.classList.contains('dark-theme')) {
                document.getElementById('admin-section').classList.add('dark-theme');
            }
            
            // Add event listener for notification form
            const notificationForm = document.getElementById('notification-form');
            if (notificationForm) {
                notificationForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    
                    const message = document.getElementById('notification-message').value.trim();
                    const isActive = document.getElementById('notification-active').checked;
                    
                    fetch('/admin/set-notification', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            message: message,
                            is_active: isActive
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            showToast('Notification updated successfully', 'success');
                        } else {
                            showToast(data.error || 'Failed to update notification', 'error');
                        }
                    })
                    .catch(error => {
                        console.error('Notification update error:', error);
                        showToast('Error updating notification', 'error');
                    });
                });
            }
            
            // Fetch and display feedbacks
            fetchFeedbacks();
        } else {
            // Ensure dark theme is applied if it's currently active
            const body = document.body;
            if (body.classList.contains('dark-theme')) {
                document.getElementById('admin-section').classList.add('dark-theme');
            }
        }
    }
    
    function hideAdminPanel() {
        // Remove admin section from bottom nav
        const adminNavItem = document.querySelector('.bottom-nav-item[data-section="admin-section"]');
        if (adminNavItem) {
            adminNavItem.remove();
        }
        
        // Hide admin section if it exists
        const adminSection = document.getElementById('admin-section');
        if (adminSection) {
            adminSection.style.display = 'none';
        }
    }
    
    function fetchFeedbacks() {
        fetch('/admin/feedbacks')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayFeedbacks(data.feedbacks);
                } else {
                    showToast(data.error || 'Failed to fetch feedbacks', 'error');
                }
            })
            .catch(error => {
                console.error('Fetch feedbacks error:', error);
                showToast('Error fetching feedbacks', 'error');
            });
    }
    
    function displayFeedbacks(feedbacks) {
        const feedbacksList = document.getElementById('feedbacks-list');
        const noFeedbacks = document.getElementById('no-feedbacks');
        
        if (feedbacks && feedbacks.length > 0) {
            // Hide no feedbacks message
            if (noFeedbacks) {
                noFeedbacks.style.display = 'none';
            }
            
            // Clear existing feedbacks
            feedbacksList.innerHTML = '';
            
            // Display feedbacks
            feedbacks.forEach(feedback => {
                const feedbackHtml = `
                    <div class="feedback-item">
                        <div class="feedback-header">
                            <span class="feedback-user">${feedback.username || 'Anonymous'}</span>
                            <span class="feedback-time">${formatDate(feedback.timestamp)}</span>
                        </div>
                        <div class="feedback-content">
                            <p>${feedback.feedback_text}</p>
                        </div>
                    </div>
                `;
                
                feedbacksList.insertAdjacentHTML('beforeend', feedbackHtml);
            });
        } else {
            // Show no feedbacks message
            if (noFeedbacks) {
                noFeedbacks.style.display = 'block';
            }
        }
    }

    // Theme toggle functionality
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            toggleTheme();
        });
    }

    function initializeTheme() {
        const savedTheme = localStorage.getItem('preferredTheme');
        const body = document.body;
        const toggle = document.getElementById('theme-toggle');
        
        if (savedTheme === 'dark') {
            body.classList.add('dark-theme');
            if (toggle) toggle.checked = true;
            
            // Apply theme to admin panel if it exists
            const adminSection = document.getElementById('admin-section');
            if (adminSection) {
                adminSection.classList.add('dark-theme');
            }
            
            // Apply theme to notification modal if it exists
            const notificationModal = document.getElementById('notificationModal');
            if (notificationModal) {
                notificationModal.classList.add('dark-theme');
            }
        } else {
            body.classList.remove('dark-theme');
            if (toggle) toggle.checked = false;
        }
    }

    function toggleTheme() {
        const body = document.body;
        body.classList.toggle('dark-theme');
        
        // Apply theme to admin panel if it exists
        const adminSection = document.getElementById('admin-section');
        if (adminSection) {
            if (body.classList.contains('dark-theme')) {
                adminSection.classList.add('dark-theme');
            } else {
                adminSection.classList.remove('dark-theme');
            }
        }
        
        // Apply theme to notification modal if it exists
        const notificationModal = document.getElementById('notificationModal');
        if (notificationModal) {
            if (body.classList.contains('dark-theme')) {
                notificationModal.classList.add('dark-theme');
            } else {
                notificationModal.classList.remove('dark-theme');
            }
        }
        
        // Save theme preference
        localStorage.setItem('preferredTheme', body.classList.contains('dark-theme') ? 'dark' : 'light');
        
        if (body.classList.contains('dark-theme')) {
            showToast('Dark mode enabled', 'info');
        } else {
            showToast('Dark mode disabled', 'info');
        }
    }

    // Password toggle functionality
    const togglePassword = document.querySelectorAll('.password-toggle-icon');

    togglePassword.forEach(icon => {
        icon.addEventListener('click', function (e) {
            // get the associated input field ID from the icon's ID
            const inputId = this.id.replace('toggle-', '');
            const passwordInput = document.getElementById(inputId);

            // toggle the type attribute
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // toggle the eye slash icon
            this.classList.toggle('fa-eye-slash');
            this.classList.toggle('fa-eye');
        });
    });
}); 
