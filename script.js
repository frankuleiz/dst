let derivWs;
let marketsData = {};         // Store data for all markets
let activeMarkets = ["R_100", "R_75", "R_50", "R_25", "R_10", "RDBEAR", "RDBULL", "1HZ10V", "1HZ15V", "1HZ30V", "1HZ50V", "1HZ75V", "1HZ90V", "1HZ100V"];
let tickCount = 120;          // Default tick count
let totalProcessedTicks = 0;  // Total counter for all ticks
let predictionTimer = null;   // Countdown timer
let countdownSeconds = 0;     // Current countdown value
let currentPrediction = null; // Track current prediction digit
let isAuthenticated = false;  // Authentication state flag

// Market names mapping
const marketNames = {
    "R_100": "Volatility 100",
    "R_75": "Volatility 75",
    "R_50": "Volatility 50",
    "R_25": "Volatility 25",
    "R_10": "Volatility 10",
    "RDBEAR": "Bear Market",
    "RDBULL": "Bull Market",
    "1HZ10V": "1s Volatility 10",
    "1HZ15V": "1s Volatility 15",
    "1HZ30V": "1s Volatility 30",
    "1HZ50V": "1s Volatility 50",
    "1HZ75V": "1s Volatility 75",
    "1HZ90V": "1s Volatility 90",
    "1HZ100V": "1s Volatility 100"
};

// Helper function to get market name
function getMarketName(symbol) {
    return marketNames[symbol] || symbol;
}

// Helper function to get display name (replace specific name with Admin)
function getDisplayName(userName) {
    console.log('🔍 getDisplayName called with:', userName);
    if (userName === 'Wallace Peter Karanja Guthera') {
        console.log('✅ Name replacement: Wallace Peter Karanja Guthera -> Admin');
        return 'Admin';
    }
    console.log('ℹ️ No replacement needed for:', userName);
    return userName;
}

// Function to clear all stored authentication data
function clearStoredAuthData() {
    localStorage.removeItem('derivlite_user');
    localStorage.removeItem('derivlite_token');
    localStorage.removeItem('derivlite_auth_time');
    console.log('🗑️ Cleared all stored authentication data');
}

// Initialize market data structure
function initializeMarketData() {
    activeMarkets.forEach(symbol => {
        marketsData[symbol] = {
            tickHistory: [],
            decimalPlaces: 2,
            processedTicks: 0,
            lastPrice: null,
            digitCounts: new Array(10).fill(0)
        };
    });
}

// Countdown timer functions
function startPredictionCountdown() {
    // Clear existing timer
    if (predictionTimer) {
        clearInterval(predictionTimer);
    }
    
    countdownSeconds = 37;
    updateCountdownDisplay();
    
    predictionTimer = setInterval(() => {
        countdownSeconds--;
        updateCountdownDisplay();
        
        if (countdownSeconds <= 0) {
            clearInterval(predictionTimer);
            predictionTimer = null;
            currentPrediction = null; // Clear current prediction when timer expires
            
            // Clear the prediction display when timer expires
            const container = document.getElementById('prediction-highlights');
            if (container) {
                container.innerHTML = '<div class="no-predictions">No repeating patterns detected yet...</div>';
            }
            
            console.log('🕐 Countdown expired - Prediction cleared, ready for new predictions');
        }
    }, 1000);
}

function updateCountdownDisplay() {
    const countdownElement = document.getElementById('prediction-countdown');
    if (countdownElement) {
        if (countdownSeconds > 0) {
            countdownElement.textContent = `⏰ ${countdownSeconds}s`;
            countdownElement.style.display = 'block';
        } else {
            countdownElement.style.display = 'none';
        }
    }
}

function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connection-status');
    if (connected) {
        statusElement.textContent = 'Connected';
        statusElement.className = 'status-connected';
    } else {
        statusElement.textContent = 'Disconnected';
        statusElement.className = 'status-disconnected';
    }
}

// UI Update Functions
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connection-status');
    if (connected) {
        statusElement.textContent = `Connected (${activeMarkets.length} markets)`;
        statusElement.className = 'status-connected';
    } else {
        statusElement.textContent = 'Disconnected';
        statusElement.className = 'status-disconnected';
    }
}

function updateAggregatedPrice() {
    // Display the most recent price from any market
    let latestPrice = null;
    let latestSymbol = null;
    let latestTime = 0;
    
    Object.keys(marketsData).forEach(symbol => {
        const market = marketsData[symbol];
        if (market.tickHistory.length > 0) {
            const lastTick = market.tickHistory[market.tickHistory.length - 1];
            if (lastTick.time > latestTime) {
                latestTime = lastTick.time;
                latestPrice = lastTick.quote;
                latestSymbol = symbol;
            }
        }
    });
    
    if (latestPrice !== null) {
        const priceElement = document.getElementById('current-price');
        const lastDigitElement = document.getElementById('last-digit');
        const symbolElement = document.getElementById('current-symbol');
        
        if (priceElement) {
            priceElement.textContent = latestPrice.toFixed(marketsData[latestSymbol].decimalPlaces);
            priceElement.style.animation = 'pulse 0.5s ease-in-out';
            setTimeout(() => {
                priceElement.style.animation = '';
            }, 500);
        }
        
        if (lastDigitElement) {
            const lastDigit = getLastDigit(latestPrice, marketsData[latestSymbol].decimalPlaces);
            lastDigitElement.textContent = `Last Digit: ${lastDigit}`;
            lastDigitElement.className = `last-digit digit-${lastDigit}`;
        }
        
        if (symbolElement) {
            symbolElement.textContent = latestSymbol;
        }
    }
}

function updateDigitPercentages() {
    // Aggregate digit counts from all markets
    let aggregatedDigitCounts = new Array(10).fill(0);
    let totalTicks = 0;
    
    Object.values(marketsData).forEach(market => {
        market.digitCounts.forEach((count, digit) => {
            aggregatedDigitCounts[digit] += count;
        });
        totalTicks += market.tickHistory.length;
    });
    
    if (totalTicks === 0) return;
    
    const digitPercentages = aggregatedDigitCounts.map(count => ((count / totalTicks) * 100).toFixed(2));
    
    digitPercentages.forEach((percentage, digit) => {
        const percentageElement = document.getElementById(`digit-${digit}`);
        const barElement = document.getElementById(`bar-${digit}`);
        
        if (percentageElement) {
            percentageElement.textContent = `${percentage}%`;
        }
        
        if (barElement) {
            barElement.style.width = `${percentage}%`;
            barElement.style.backgroundColor = getDigitColor(digit);
        }
    });
    
    // Update extremes
    let highestDigit = digitPercentages.indexOf(Math.max(...digitPercentages.map(p => parseFloat(p))).toFixed(2));
    let lowestDigit = digitPercentages.indexOf(Math.min(...digitPercentages.map(p => parseFloat(p))).toFixed(2));
    
    updateExtremes(highestDigit, lowestDigit);
    
    // Bubble.io integration for aggregated data
    digitPercentages.forEach((percentage, digit) => {
        if (typeof window[`bubble_fn_${digit}`] === "function") {
            window[`bubble_fn_${digit}`](parseFloat(percentage));
        }
    });
    
    if (typeof window.bubble_fn_highest === "function") {
        window.bubble_fn_highest(highestDigit);
    }
    
    if (typeof window.bubble_fn_lowest === "function") {
        window.bubble_fn_lowest(lowestDigit);
    }
}

function updateExtremes(highest, lowest) {
    const highestElement = document.getElementById('highest-digit');
    const lowestElement = document.getElementById('lowest-digit');
    
    if (highestElement) {
        highestElement.textContent = highest;
        highestElement.className = `extreme-value digit-${highest}`;
    }
    if (lowestElement) {
        lowestElement.textContent = lowest;
        lowestElement.className = `extreme-value digit-${lowest}`;
    }
}

function updateLast50Digits() {
    // Get last 50 digits from all markets combined, sorted by timestamp
    let allRecentTicks = [];
    
    Object.keys(marketsData).forEach(symbol => {
        const market = marketsData[symbol];
        market.tickHistory.forEach(tick => {
            allRecentTicks.push({
                time: tick.time,
                quote: tick.quote,
                symbol: symbol,
                decimalPlaces: market.decimalPlaces
            });
        });
    });
    
    // Sort by timestamp and take last 50
    allRecentTicks.sort((a, b) => a.time - b.time);
    const last50Ticks = allRecentTicks.slice(-50);
    
    const last50Digits = last50Ticks.map(tick => getLastDigit(tick.quote, tick.decimalPlaces));
    const digitsString = last50Digits.join(',');
    
    const container = document.getElementById('last-50-digits');
    if (container) {
        container.innerHTML = last50Digits.map((digit, index) => {
            const tick = last50Ticks[index];
            return `<span class="digit-chip digit-${digit}" title="${tick.symbol}: ${tick.quote.toFixed(tick.decimalPlaces)}">${digit}</span>`;
        }).join('');
    }
    
    // Bubble.io integration
    if (typeof window.bubble_fn_last50 === "function") {
        window.bubble_fn_last50(digitsString);
    }
    
    console.log("✅ Last 50 Digits (All Markets):", digitsString);
}

function updateTickCounter() {
    const counter = document.getElementById('tick-counter');
    if (counter) {
        counter.textContent = totalProcessedTicks;
    }
}

function updatePredictionHighlights() {
    // Find digits above threshold and their markets
    const threshold = 18.2;
    const requiredTicks = tickCount; // Require exactly the full tick count for accurate analysis
    const predictions = [];
    
    // Check if we have exactly the required number of ticks for each market
    const marketsWithFullData = Object.keys(marketsData).filter(symbol => 
        marketsData[symbol].tickHistory.length >= requiredTicks
    );
    
    const totalActiveMarkets = Object.keys(marketsData).length;
    
    if (marketsWithFullData.length === 0) {
        const container = document.getElementById('prediction-highlights');
        if (container) {
            container.innerHTML = '<div class="no-predictions">Fetching historical data (120 ticks per market)...</div>';
        }
        return;
    } else if (marketsWithFullData.length < totalActiveMarkets) {
        const container = document.getElementById('prediction-highlights');
        if (container) {
            container.innerHTML = `<div class="no-predictions">Loading: ${marketsWithFullData.length}/${totalActiveMarkets} markets ready with ${requiredTicks} ticks...</div>`;
        }
        return;
    }
    
    console.log(`📊 Analysis ready: All ${totalActiveMarkets} markets have ${requiredTicks} ticks for accurate predictions`);
    
    // Check each digit (0-9)
    for (let digit = 0; digit <= 9; digit++) {
        let digitMarkets = [];
        let totalCount = 0;
        let totalTicks = 0;
        
        // Check each market for this digit (only markets with full data)
        marketsWithFullData.forEach(symbol => {
            const market = marketsData[symbol];
            const marketDigitCount = market.digitCounts[digit];
            const marketTotalTicks = market.tickHistory.length;
            const marketPercentage = ((marketDigitCount / marketTotalTicks) * 100);
            
            if (marketPercentage >= threshold) {
                digitMarkets.push({
                    symbol: symbol,
                    percentage: marketPercentage.toFixed(2),
                    count: marketDigitCount,
                    total: marketTotalTicks
                });
            }
            
            totalCount += marketDigitCount;
            totalTicks += marketTotalTicks;
        });
        
        // Calculate overall percentage for this digit
        const overallPercentage = totalTicks > 0 ? ((totalCount / totalTicks) * 100) : 0;
        
        // Debug logging
        if (overallPercentage >= threshold || digitMarkets.length > 0) {
            console.log(`🎯 Digit ${digit}: Overall ${overallPercentage.toFixed(2)}%, Markets above threshold: ${digitMarkets.length}`);
        }
        
        // If overall percentage is above threshold OR any individual market is above threshold
        if (overallPercentage >= threshold || digitMarkets.length > 0) {
            predictions.push({
                digit: digit,
                overallPercentage: overallPercentage.toFixed(2),
                markets: digitMarkets,
                totalCount: totalCount,
                totalTicks: totalTicks
            });
        }
    }
    
    // Sort by overall percentage (highest first)
    predictions.sort((a, b) => parseFloat(b.overallPercentage) - parseFloat(a.overallPercentage));
    
    // Only show the first (highest) prediction
    const topPredictions = predictions.length > 0 ? [predictions[0]] : [];
    
    // Update the UI
    const container = document.getElementById('prediction-highlights');
    if (container) {
        // If there's an active timer, don't update the display - keep current prediction
        if (predictionTimer !== null) {
            console.log('⏳ Timer active - keeping current prediction displayed');
            return; // Don't update anything while timer is running
        }
        
        // Only update when no timer is running
        if (topPredictions.length === 0) {
            container.innerHTML = '<div class="no-predictions">No repeating patterns detected yet...</div>';
            currentPrediction = null;
        } else {
            // Show new prediction and start timer
            const newPrediction = topPredictions[0];
            const predictionKey = `${newPrediction.digit}-${newPrediction.overallPercentage}`;
            
            container.innerHTML = topPredictions.map(pred => {
            const marketTags = pred.markets.map(market => 
                `<span class="prediction-market-tag">${getMarketName(market.symbol)}</span>`
            ).join('');
            
            const hasIndividualHighs = pred.markets.length > 0;
            const statusIcon = hasIndividualHighs ? '🔥' : '📈';
            
            return `
                <div class="prediction-item">
                    <div class="prediction-digit">${statusIcon} ${pred.digit}</div>
                    <div id="prediction-countdown" class="prediction-countdown">⏰ 37s</div>
                    <div class="prediction-markets">
                        ${hasIndividualHighs ? 
                            `<strong>Hot Markets:</strong><br>${marketTags}` : 
                            `<strong>Overall Average</strong><br>Across all markets`
                        }
                    </div>
                </div>
            `;
            }).join('');
            
            // Start countdown for new prediction
            currentPrediction = predictionKey;
            startPredictionCountdown();
            console.log(`🎯 New prediction detected: Digit ${newPrediction.digit} (${newPrediction.overallPercentage}%) - Starting 37s countdown`);
        }
    }
    
    console.log(`🎯 Prediction Highlights: ${predictions.length} digits above ${threshold}%, showing top ${topPredictions.length}`);
    
    // Bubble.io integration for predictions (send only the top prediction)
    if (typeof window.bubble_fn_predictions === "function") {
        const predictionData = topPredictions.map(p => ({
            digit: p.digit,
            percentage: p.overallPercentage,
            markets: p.markets.length
        }));
        window.bubble_fn_predictions(JSON.stringify(predictionData));
    }
}

function updateMarketsList() {
    const marketsElement = document.getElementById('active-markets');
    if (marketsElement) {
        const activeCount = Object.keys(marketsData).filter(symbol => 
            marketsData[symbol].tickHistory.length > 0
        ).length;
        marketsElement.textContent = `${activeCount}/${activeMarkets.length} markets active`;
    }
}

function getDigitColor(digit) {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[digit] || '#666';
}

// Function to start WebSocket connection
function startWebSocket() {
    // Check authentication before starting analysis
    if (!isAuthenticated) {
        console.warn('⚠️ Cannot start analysis without authentication');
        return;
    }

    if (derivWs) {
        derivWs.close();
    }

    // Initialize market data
    initializeMarketData();
    updateConnectionStatus(false);
    totalProcessedTicks = 0;
    updateTickCounter();

    derivWs = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

    derivWs.onopen = function () {
        console.log(`✅ Connected to Deriv API for ${activeMarkets.length} markets`);
        updateConnectionStatus(true);
        
        // Request exactly tickCount (120) historical ticks for all markets
        activeMarkets.forEach(symbol => {
            console.log(`📡 Requesting ${tickCount} historical ticks for ${symbol}`);
            requestTickHistory(symbol);
        });
    };

    derivWs.onmessage = function (event) {
        const data = JSON.parse(event.data);

        if (data.history) {
            const symbol = data.echo_req.ticks_history;
            const receivedCount = data.history.prices.length;
            console.log(`📊 ${symbol}: Loaded ${receivedCount}/${tickCount} historical ticks`);
            
            marketsData[symbol].tickHistory = data.history.prices.map((price, index) => ({
                time: data.history.times[index],
                quote: parseFloat(price)
            }));

            detectDecimalPlaces(symbol);
            analyzeMarket(symbol);
            
            // Update aggregated displays
            updateAllDisplays();
        }

        if (data.tick) {
            const symbol = data.tick.symbol;
            let tickQuote = parseFloat(data.tick.quote);
            
            if (marketsData[symbol]) {
                console.log(`🔄 New Tick ${symbol}: ${tickQuote.toFixed(marketsData[symbol].decimalPlaces)}`);

                marketsData[symbol].tickHistory.push({ 
                    time: data.tick.epoch, 
                    quote: tickQuote 
                });

                if (marketsData[symbol].tickHistory.length > tickCount) {
                    marketsData[symbol].tickHistory.shift();
                }

                analyzeMarket(symbol);
                updateAllDisplays();
                
                totalProcessedTicks++;
                updateTickCounter();

                // Bubble.io integration for latest tick
                let lastDigit = getLastDigit(tickQuote, marketsData[symbol].decimalPlaces);
                let isEven = lastDigit % 2 === 0 ? 1 : 0;
                let isOdd = lastDigit % 2 !== 0 ? 1 : 0;

                if (typeof window.bubble_fn_wsEvent1 === "function") {
                    window.bubble_fn_wsEvent1(lastDigit);
                }

                if (typeof window.bubble_fn_price1 === "function") {
                    window.bubble_fn_price1(tickQuote.toFixed(marketsData[symbol].decimalPlaces));
                }

                if (typeof window.bubble_fn_even === "function") {
                    window.bubble_fn_even(isEven);
                }

                if (typeof window.bubble_fn_odd === "function") {
                    window.bubble_fn_odd(isOdd);
                }
            }
        }
    };

    derivWs.onerror = function (error) {
        console.error("❌ WebSocket Error:", error);
        updateConnectionStatus(false);
    };

    derivWs.onclose = function () {
        console.warn("⚠️ WebSocket Disconnected");
        updateConnectionStatus(false);
    };
}

// Function to request tick history for a specific symbol
function requestTickHistory(symbol) {
    const request = {
        ticks_history: symbol,
        count: tickCount,
        end: "latest",
        style: "ticks",
        subscribe: 1
    };
    derivWs.send(JSON.stringify(request));
}

// Function to detect the number of decimal places dynamically for a market
function detectDecimalPlaces(symbol) {
    const market = marketsData[symbol];
    let decimalCounts = market.tickHistory.map(tick => {
        let decimalPart = tick.quote.toString().split(".")[1] || "";
        return decimalPart.length;
    });

    market.decimalPlaces = Math.max(...decimalCounts, 2);
    console.log(`🔍 Detected Decimal Places for ${symbol}: ${market.decimalPlaces}`);
}

// Function to extract the last digit
function getLastDigit(price, decimalPlaces = 2) {
    let priceStr = price.toString();
    let priceParts = priceStr.split(".");
    let decimals = priceParts[1] || "";

    while (decimals.length < decimalPlaces) {
        decimals += "0";
    }

    return Number(decimals.slice(-1));
}

// Function to analyze a specific market
function analyzeMarket(symbol) {
    const market = marketsData[symbol];
    if (market.tickHistory.length === 0) return;

    // Reset counts
    market.digitCounts.fill(0);

    // Analyze digits
    market.tickHistory.forEach(tick => {
        let lastDigit = getLastDigit(tick.quote, market.decimalPlaces);
        market.digitCounts[lastDigit]++;
    });

    console.log(`✅ Analyzed ${symbol}: ${market.tickHistory.length} ticks`);
}

// Function to update all displays with aggregated data
function updateAllDisplays() {
    updateMarketsList();
    updatePredictionHighlights();
}

// Function to update symbol (now updates which markets to analyze)
window.updateSymbol = function (newSymbol) {
    console.log(`🔄 Updating to analyze: ${newSymbol}`);
    if (newSymbol === 'ALL') {
        activeMarkets = ["R_100", "R_75", "R_50", "R_25", "R_10", "RDBEAR", "RDBULL", "1HZ10V", "1HZ15V", "1HZ30V", "1HZ50V", "1HZ75V", "1HZ90V", "1HZ100V"];
    } else {
        activeMarkets = [newSymbol];
    }
    // Only restart WebSocket if authenticated and connected
    if (isAuthenticated && derivWs && derivWs.readyState === WebSocket.OPEN) {
        startWebSocket();
    }
};

// Function to update tick count
window.updateTickCount = function (newTickCount) {
    console.log(`🔄 Updating tick count to: ${newTickCount}`);
    tickCount = newTickCount;
    // Only restart WebSocket if authenticated and connected
    if (isAuthenticated && derivWs && derivWs.readyState === WebSocket.OPEN) {
        startWebSocket();
    }
};

// Start WebSocket on page load
document.addEventListener('DOMContentLoaded', function() {
    // Clear any stored authentication data to ensure fresh login
    clearStoredAuthData();
    
    // Don't auto-start WebSocket - wait for authentication
    // startWebSocket(); // Moved to after authentication
    
    // Add some visual feedback for controls
    const symbolSelect = document.getElementById('symbol-select');
    const tickCountSelect = document.getElementById('tick-count');
    
    if (symbolSelect) {
        symbolSelect.addEventListener('change', function() {
            this.style.animation = 'pulse 0.3s ease-in-out';
            setTimeout(() => {
                this.style.animation = '';
            }, 300);
        });
    }
    
    if (tickCountSelect) {
        tickCountSelect.addEventListener('change', function() {
            this.style.animation = 'pulse 0.3s ease-in-out';
            setTimeout(() => {
                this.style.animation = '';
            }, 300);
        });
    }
});

// Deriv OAuth Configuration
const DERIV_OAUTH_CONFIG = {
    app_id: '100912',
    oauth_url: 'https://oauth.deriv.com/oauth2/authorize',
    redirect_uri: window.location.origin + window.location.pathname, // Current page as redirect
    scope: 'read'
};

// User data storage
let currentUser = null;

// Login attempt tracking
const LOGIN_ATTEMPT_LIMIT = 4;
const LOGIN_ATTEMPT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// Track login attempts
function trackLoginAttempt() {
    const now = Date.now();
    const attempts = getLoginAttempts();
    
    // Add current attempt
    attempts.push(now);
    
    // Store updated attempts
    localStorage.setItem('derivlite_login_attempts', JSON.stringify(attempts));
    
    console.log(`📊 Login attempt tracked. Total attempts in last hour: ${attempts.length}`);
}

// Get valid login attempts within the time window
function getLoginAttempts() {
    try {
        const stored = localStorage.getItem('derivlite_login_attempts');
        const attempts = stored ? JSON.parse(stored) : [];
        const now = Date.now();
        
        // Filter attempts within the last hour
        const validAttempts = attempts.filter(timestamp => (now - timestamp) < LOGIN_ATTEMPT_WINDOW);
        
        // Update localStorage with only valid attempts
        localStorage.setItem('derivlite_login_attempts', JSON.stringify(validAttempts));
        
        return validAttempts;
    } catch (error) {
        console.warn('⚠️ Error reading login attempts:', error);
        return [];
    }
}

// Check if login attempts exceed limit
function isLoginLimitExceeded() {
    const attempts = getLoginAttempts();
    const exceeded = attempts.length >= LOGIN_ATTEMPT_LIMIT;
    
    if (exceeded) {
        const oldestAttempt = Math.min(...attempts);
        const timeUntilReset = LOGIN_ATTEMPT_WINDOW - (Date.now() - oldestAttempt);
        const minutesLeft = Math.ceil(timeUntilReset / (60 * 1000));
        
        console.warn(`🚫 Login limit exceeded. ${attempts.length} attempts in last hour. Reset in ${minutesLeft} minutes.`);
    }
    
    return exceeded;
}

// Clear login attempts (called on successful authentication)
function clearLoginAttempts() {
    localStorage.removeItem('derivlite_login_attempts');
    console.log('✅ Login attempts cleared after successful authentication');
}

// Show too many attempts modal
function showTooManyAttemptsModal() {
    const attempts = getLoginAttempts();
    const oldestAttempt = Math.min(...attempts);
    const timeUntilReset = LOGIN_ATTEMPT_WINDOW - (Date.now() - oldestAttempt);
    const minutesLeft = Math.ceil(timeUntilReset / (60 * 1000));
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('too-many-attempts-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'too-many-attempts-modal';
        modal.className = 'auth-modal';
        modal.innerHTML = `
            <div class="auth-modal-content">
                <div class="auth-header">
                    <i class="fas fa-exclamation-triangle" style="color: #ff6b35; font-size: 2rem; margin-bottom: 10px;"></i>
                    <h2>Too Many Login Attempts</h2>
                    <p>You have exceeded the maximum number of login attempts.</p>
                </div>
                
                <div class="attempt-info">
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>Attempts: ${attempts.length}/${LOGIN_ATTEMPT_LIMIT}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-hourglass-half"></i>
                        <span id="reset-timer">Try again in ${minutesLeft} minute(s)</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-info-circle"></i>
                        <span>This is to protect against automated attacks</span>
                    </div>
                </div>
                
                <div class="auth-footer">
                    <p class="terms-text">
                        If you're having trouble logging in, please wait for the timer to reset or 
                        <a href="mailto:admin@derivlite.com" class="terms-link">contact support</a>
                    </p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Update timer every minute
    const timerElement = document.getElementById('reset-timer');
    const updateTimer = () => {
        const currentAttempts = getLoginAttempts();
        if (currentAttempts.length < LOGIN_ATTEMPT_LIMIT) {
            // Limit no longer exceeded, hide modal
            hideTooManyAttemptsModal();
            showAuthModal();
            return;
        }
        
        const currentOldest = Math.min(...currentAttempts);
        const currentTimeLeft = LOGIN_ATTEMPT_WINDOW - (Date.now() - currentOldest);
        const currentMinutesLeft = Math.ceil(currentTimeLeft / (60 * 1000));
        
        if (currentMinutesLeft <= 0) {
            hideTooManyAttemptsModal();
            showAuthModal();
        } else {
            timerElement.textContent = `Try again in ${currentMinutesLeft} minute(s)`;
        }
    };
    
    // Update timer every 30 seconds
    const timerInterval = setInterval(updateTimer, 30000);
    modal.setAttribute('data-timer-interval', timerInterval);
    
    showNotification(`Too many login attempts. Please wait ${minutesLeft} minute(s) before trying again.`, 'error');
}

// Hide too many attempts modal
function hideTooManyAttemptsModal() {
    const modal = document.getElementById('too-many-attempts-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Clear timer interval
        const timerInterval = modal.getAttribute('data-timer-interval');
        if (timerInterval) {
            clearInterval(timerInterval);
        }
    }
}

// Deriv OAuth Functions
function loginWithDeriv() {
    // Check if login attempts exceed limit
    if (isLoginLimitExceeded()) {
        console.warn('🚫 Login attempt blocked - too many attempts');
        hideAuthModal();
        showTooManyAttemptsModal();
        return;
    }
    
    // Track this login attempt
    trackLoginAttempt();
    
    const btn = document.querySelector('.deriv-auth-btn');
    const originalContent = btn.innerHTML;
    
    // Show loading state
    btn.innerHTML = `
        <div class="deriv-logo">
            <i class="fas fa-spinner fa-spin"></i>
        </div>
        <span>Redirecting to Deriv...</span>
    `;
    btn.disabled = true;
    
    // Build OAuth URL
    const params = new URLSearchParams({
        app_id: DERIV_OAUTH_CONFIG.app_id,
        l: 'en',
        brand: 'deriv'
    });
    
    const oauthUrl = `${DERIV_OAUTH_CONFIG.oauth_url}?${params.toString()}`;
    
    // Store the current URL for returning after OAuth
    localStorage.setItem('derivlite_return_url', window.location.href);
    
    console.log('🔐 Redirecting to Deriv OAuth:', oauthUrl);
    
    // Redirect to Deriv OAuth
    setTimeout(() => {
        window.location.href = oauthUrl;
    }, 1000);
}

// Handle OAuth callback
function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // First check if this is actually an OAuth callback
    // Look for OAuth-specific parameters to determine if this is a callback
    const hasOAuthParams = urlParams.has('acct1') || urlParams.has('token1') || 
                          urlParams.has('error') || urlParams.has('error_description');
    
    if (!hasOAuthParams) {
        // Not an OAuth callback, don't process or show any notifications
        console.log('✅ No OAuth parameters found - not an OAuth callback');
        return false;
    }
    
    console.log('🔍 OAuth callback detected, processing...');
    
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    // Check for OAuth errors first
    if (error) {
        console.error('❌ OAuth error received:', { error, errorDescription });
        handleOAuthError(error, errorDescription);
        return false;
    }
    
    // Parse multiple accounts from URL parameters
    const accounts = [];
    let accountIndex = 1;
    
    // Extract all accounts from the URL (acct1, acct2, etc.)
    while (true) {
        const accountId = urlParams.get(`acct${accountIndex}`);
        const token = urlParams.get(`token${accountIndex}`);
        const currency = urlParams.get(`cur${accountIndex}`);
        
        if (!accountId || !token) {
            break; // No more accounts
        }
        
        accounts.push({
            accountId: accountId,
            token: token,
            currency: currency || 'USD',
            isVirtual: accountId.startsWith('VRT'),
            accountType: accountId.startsWith('VRT') ? 'virtual' : 'real'
        });
        
        accountIndex++;
    }
    
    // Check if we have any accounts (only show error if this is actually an OAuth callback)
    if (accounts.length === 0) {
        console.warn('⚠️ No accounts found in OAuth callback');
        showNotification('No accounts received from Deriv. Please try again.', 'error');
        return false;
    }
    
    console.log('� Processing OAuth callback with accounts:', accounts.map(acc => ({
        id: acc.accountId,
        currency: acc.currency,
        type: acc.accountType
    })));
    
    // Show processing state
    showAuthProcessing();
    
    try {
        // Use the first real account, or first account if no real accounts
        let selectedAccount = accounts.find(acc => !acc.isVirtual) || accounts[0];
        
        // If multiple accounts available, log them for potential future account selection feature
        if (accounts.length > 1) {
            console.log('🏦 Multiple accounts available:', accounts.map(acc => ({
                id: acc.accountId,
                type: acc.accountType,
                currency: acc.currency
            })));
            
            // Prioritize real accounts over virtual accounts
            const realAccounts = accounts.filter(acc => !acc.isVirtual);
            if (realAccounts.length > 0) {
                selectedAccount = realAccounts[0];
                console.log('✅ Selected first real account:', selectedAccount.accountId);
            } else {
                console.log('ℹ️ No real accounts found, using virtual account:', selectedAccount.accountId);
            }
        }
        
        console.log('✅ Selected account:', {
            accountId: selectedAccount.accountId,
            currency: selectedAccount.currency,
            type: selectedAccount.accountType,
            isVirtual: selectedAccount.isVirtual
        });
        
        // Create user data object
        const userData = {
            accountId: selectedAccount.accountId,
            token: selectedAccount.token,
            currency: selectedAccount.currency,
            isVirtual: selectedAccount.isVirtual,
            accountType: selectedAccount.accountType,
            email: 'Not available via OAuth', // Email not provided in this format
            name: selectedAccount.accountId, // Use account ID as name for now
            allAccounts: accounts, // Store all accounts for potential future use
            loginTime: new Date().toISOString(),
            language: urlParams.get('lang') || 'EN'
        };
        
        // Validate required fields
        if (!userData.accountId || !userData.token) {
            throw new Error('Required account information missing');
        }
        
        if (userData.accountId.length < 5) {
            throw new Error('Invalid account ID format');
        }
        
        console.log('✅ User data created successfully:', {
            accountId: userData.accountId,
            currency: userData.currency,
            accountType: userData.accountType,
            isVirtual: userData.isVirtual,
            totalAccounts: userData.allAccounts.length
        });
        
        // Try to get additional user info from Deriv API
        fetchUserInfoFromAPI(userData)
            .then(enhancedUserData => {
                completeAuthentication(enhancedUserData);
            })
            .catch(error => {
                console.warn('⚠️ Could not fetch additional user info:', error);
                // Continue with basic data
                completeAuthentication(userData);
            });
        
        return true;
        
    } catch (error) {
        console.error('❌ Authentication processing failed:', error);
        
        // Hide processing state
        hideAuthProcessing();
        
        // Show user-friendly error
        const userMessage = error.message || 'Authentication failed. Please try again.';
        showNotification(userMessage, 'error');
        
        // Clean up any partial state
        cleanupFailedAuth();
        
        return false;
    }
}

// Complete the authentication process
function completeAuthentication(userData) {
    try {
        // Store user data securely
        currentUser = userData;
        localStorage.setItem('derivlite_user', JSON.stringify(userData));
        localStorage.setItem('derivlite_token', userData.token);
        localStorage.setItem('derivlite_auth_time', new Date().toISOString());
        
        // Mark as authenticated
        isAuthenticated = true;
        
        // Clear login attempts on successful authentication
        clearLoginAttempts();
        
        // Hide processing state
        hideAuthProcessing();
        
        // Clean up OAuth URL first, before any other navigation
        cleanupOAuthUrl();
        
        // Validate user access before proceeding
        validateUserAccess(userData)
            .then((hasAccess) => {
                if (hasAccess) {
                    // User has valid access, proceed
                    hideAuthModal();
                    updateUserInfo(userData);
                    showWelcomeMessage(userData);
                    
                    // Start the application
                    setTimeout(() => {
                        startWebSocket();
                    }, 500);
                    
                    console.log('🎉 Authentication completed successfully');
                } else {
                    // User doesn't have access, show payment modal
                    hideAuthModal();
                    setTimeout(() => {
                        showPaymentModal();
                    }, 500);
                    console.log('💳 User needs to purchase access');
                }
            })
            .catch((error) => {
                console.error('❌ Error validating user access:', error);
                // On validation error, assume they need to pay
                hideAuthModal();
                setTimeout(() => {
                    showPaymentModal();
                }, 500);
            });
        
    } catch (error) {
        console.error('❌ Failed to complete authentication:', error);
        hideAuthProcessing();
        showNotification('Failed to save authentication data. Please try again.', 'error');
        cleanupFailedAuth();
    }
}

// Fetch additional user information from Deriv API
async function fetchUserInfoFromAPI(userData) {
    return new Promise((resolve, reject) => {
        try {
            // Create a WebSocket connection to get user details
            const apiUrl = 'wss://ws.derivws.com/websockets/v3?app_id=100912';
            const tempWs = new WebSocket(apiUrl);
            
            tempWs.onopen = () => {
                console.log('🔗 Connected to Deriv API for user info');
                
                // First, authorize with the user's token to get full account details
                console.log('🔑 Authorizing with token:', userData.token.substring(0, 10) + '...');
                tempWs.send(JSON.stringify({
                    authorize: userData.token,
                    req_id: 1
                }));
            };
            
            tempWs.onmessage = (event) => {
                try {
                    const response = JSON.parse(event.data);
                    console.log('📨 Deriv API Response:', response);
                    
                    if (response.error) {
                        console.warn('⚠️ API error getting user info:', response.error);
                        reject(new Error(response.error.message));
                        return;
                    }
                    
                    if (response.authorize) {
                        const authorizeData = response.authorize;
                        
                        console.log('✅ Authorization successful!');
                        console.log('📧 User email from Deriv:', authorizeData.email);
                        console.log('👤 Full name:', getDisplayName(authorizeData.fullname));
                        console.log('🌍 Country:', authorizeData.country);
                        console.log('🆔 User ID:', authorizeData.user_id);
                        console.log('🏦 Login ID:', authorizeData.loginid);
                        console.log('💰 Currency:', authorizeData.currency);
                        console.log('🎯 Is Virtual:', authorizeData.is_virtual);
                        
                        // Enhance user data with API response
                        const enhancedData = {
                            ...userData,
                            email: authorizeData.email || 'Not available',
                            fullname: getDisplayName(authorizeData.fullname) || 'Not available',
                            name: getDisplayName(authorizeData.fullname) || authorizeData.loginid || userData.accountId,
                            country: authorizeData.country || 'Unknown',
                            balance: authorizeData.balance || 0,
                            userId: authorizeData.user_id,
                            loginId: authorizeData.loginid,
                            isVirtual: authorizeData.is_virtual || false,
                            scopes: authorizeData.scopes || [],
                            preferredLanguage: authorizeData.preferred_language || 'EN',
                            accountList: authorizeData.account_list || []
                        };
                        
                        console.log('✅ Enhanced user data created:', {
                            email: enhancedData.email,
                            fullname: enhancedData.fullname,
                            country: enhancedData.country,
                            isVirtual: enhancedData.isVirtual,
                            totalAccounts: enhancedData.accountList.length
                        });
                        
                        tempWs.close();
                        resolve(enhancedData);
                    }
                } catch (parseError) {
                    console.error('❌ Error parsing API response:', parseError);
                    reject(parseError);
                }
            };
            
            tempWs.onerror = (error) => {
                console.warn('⚠️ WebSocket error getting user info:', error);
                reject(error);
            };
            
            tempWs.onclose = () => {
                console.log('🔌 Temp WebSocket closed');
            };
            
            // Timeout after 10 seconds (increased from 5 for authorization)
            setTimeout(() => {
                if (tempWs.readyState === WebSocket.OPEN) {
                    tempWs.close();
                    reject(new Error('Timeout getting user info'));
                }
            }, 10000);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Validate user access by checking against DerivLite database
async function validateUserAccess(userData) {
    try {
        console.log('🔍 Starting user access validation...');
        console.log('👤 User Deriv Email:', userData.email);
        console.log('🏦 User Account ID:', userData.accountId);
        console.log('💰 Account Currency:', userData.currency);
        
        // Check if we have a valid email
        if (!userData.email || userData.email === 'Not available via OAuth') {
            console.warn('⚠️ No email available for validation, requiring payment');
            console.log('📧 Email status: Not provided by Deriv OAuth');
            showNotification('Email verification required. Please complete payment to access DigitSnap.', 'info');
            return false;
        }
        
        // Fetch data from the DerivLite API
        console.log('📡 Attempting to fetch from API: https://frankuleiz.github.io/digit-snap-data/users.json');
        
        const response = await fetch('https://frankuleiz.github.io/digit-snap-data/users.json', {
            method: 'GET'
        });
        
        console.log('📊 API Response Status:', response.status, response.statusText);
        console.log('📡 API Response Headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            if (response.status === 404) {
                console.warn('⚠️ API endpoint not found (404). This might indicate:');
                console.warn('   1. The API endpoint needs to be created in Bubble.io');
                console.warn('   2. Different URL structure required');
                console.warn('   3. The endpoint is in development mode');
                console.warn('   4. Authentication might be required');
                
                console.log('🚫 API not available - requiring payment for access');
                console.log('👤 User email that requires payment:', userData.email);
                showNotification('Validation API unavailable. Please complete payment to access DigitSnap.', 'warning');
                return false;
            } else {
                console.warn('⚠️ API response not OK:', response.status, response.statusText);
                console.log('👤 User email that failed validation:', userData.email);
                // For other errors, require payment
                return false;
            }
        }
        
        const data = await response.json();
        console.log('📊 === DATABASE API RESPONSE ===');
        console.log('📦 Full API Response:', JSON.stringify(data, null, 2));
        
        // Extract results from the nested response structure
        const results = data.response && data.response.results ? data.response.results : [];
        
        console.log('📊 Response Summary:', {
            hasResponse: !!data.response,
            totalEntries: results.length,
            cursor: data.response?.cursor,
            count: data.response?.count,
            remaining: data.response?.remaining,
            hasData: results.length > 0,
            dataType: typeof data
        });
        
        if (results.length > 0) {
            console.log('📋 Sample entry structure:', JSON.stringify(results[0], null, 2));
            console.log('📧 All emails in database:', results.map(entry => entry.email).filter(Boolean));
        }
        console.log('👤 User email to validate:', userData.email);
        console.log('='.repeat(50));
        
        // Check if results array has entries
        if (!Array.isArray(results) || results.length === 0) {
            console.log('📝 No user data in API response, requiring payment');
            console.log('👤 User email that needs payment:', userData.email);
            return false;
        }
        
        // Check if user's email exists in the results
        const userEmail = userData.email;
        const emailExists = results.some(entry => {
            // API returns email field in each result
            const match = entry.email && entry.email.toLowerCase() === userEmail.toLowerCase();
            if (match) {
                console.log('✅ Email match found!', {
                    userEmail: userEmail,
                    databaseEmail: entry.email,
                    entryId: entry._id,
                    createdDate: entry['Created Date']
                });
            }
            return match;
        });
        
        if (emailExists) {
            console.log('✅ User email found in validated list, granting access');
            
            // Find the user's entry to get additional info
            const userEntry = results.find(entry => {
                return entry.email && entry.email.toLowerCase() === userEmail.toLowerCase();
            });
            
            if (userEntry) {
                console.log('📱 === USER VALIDATION SUCCESS ===');
                console.log('👤 Validated User Details:', {
                    email: userEmail,
                    databaseEmail: userEntry.email,
                    entryId: userEntry._id,
                    createdDate: userEntry['Created Date'],
                    modifiedDate: userEntry['Modified Date'],
                    createdBy: userEntry['Created By'],
                    databaseEntry: userEntry
                });
                console.log('='.repeat(50));
                
                // Store the database info in user data for potential future use
                userData.validatedEntry = userEntry;
                userData.validatedDate = userEntry['Created Date'];
            }
            
            return true;
        } else {
            console.log('❌ === USER VALIDATION FAILED ===');
            console.log('👤 User email NOT found in validated list');
            console.log('📧 User email:', userData.email);
            console.log('📋 Available emails in database:', results.map(entry => entry.email).filter(Boolean));
            console.log('🔍 Case-insensitive search performed');
            console.log('💳 Requiring payment for access');
            console.log('='.repeat(50));
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error validating user access:', error);
        console.error('📄 Full error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        
        // Check if it's a network error
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.warn('🌐 Network error - API might be down or URL incorrect');
            showNotification('Network error connecting to validation API. Please complete payment to access DigitSnap.', 'warning');
            return false;
        }
        
        // On other errors, require payment
        showNotification('Unable to verify account status. Please complete payment to access DigitSnap.', 'warning');
        return false;
    }
}

// Handle OAuth errors
function handleOAuthError(error, description) {
    let errorMessage = 'Authentication failed';
    
    switch (error) {
        case 'access_denied':
            errorMessage = 'Access denied. You need to authorize the application to continue.';
            break;
        case 'invalid_request':
            errorMessage = 'Invalid authentication request. Please try again.';
            break;
        case 'unauthorized_client':
            errorMessage = 'Application not authorized. Please contact support.';
            break;
        case 'unsupported_response_type':
            errorMessage = 'Authentication method not supported.';
            break;
        case 'invalid_scope':
            errorMessage = 'Invalid permissions requested.';
            break;
        case 'server_error':
            errorMessage = 'Deriv server error. Please try again later.';
            break;
        case 'temporarily_unavailable':
            errorMessage = 'Authentication service temporarily unavailable. Please try again.';
            break;
        default:
            errorMessage = description || 'Unknown authentication error occurred.';
    }
    
    console.error('OAuth Error Details:', { error, description, userMessage: errorMessage });
    showNotification(errorMessage, 'error');
    
    // Clean up and show auth modal
    cleanupFailedAuth();
}

// Show authentication processing state
function showAuthProcessing() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        const content = modal.querySelector('.auth-modal-content');
        if (content) {
            content.innerHTML = `
                <div class="auth-header">
                    <div class="processing-spinner">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #FFD700;"></i>
                    </div>
                    <h2 style="color: #FFD700; margin-top: 20px;">Processing Authentication</h2>
                    <p style="color: #FFEB3B; opacity: 0.9;">Verifying your Deriv account...</p>
                </div>
                <div class="processing-steps">
                    <div class="step active">
                        <i class="fas fa-check-circle"></i>
                        <span>Received authorization</span>
                    </div>
                    <div class="step processing">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Validating account data</span>
                    </div>
                    <div class="step">
                        <i class="fas fa-circle"></i>
                        <span>Initializing DigitSnap</span>
                    </div>
                </div>
            `;
        }
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
    }
}

// Hide authentication processing state
function hideAuthProcessing() {
    // This will be handled by hideAuthModal() when auth is successful
}

// Clean up OAuth URL parameters
function cleanupOAuthUrl() {
    try {
        // List of OAuth parameters to remove from URL
        const oauthParams = [
            'acct1', 'acct2', 'acct3', 'acct4', 'acct5', // Account IDs
            'token1', 'token2', 'token3', 'token4', 'token5', // Tokens
            'cur1', 'cur2', 'cur3', 'cur4', 'cur5', // Currencies
            'error', 'error_description', // Error parameters
            'lang', 'state', 'code' // Other OAuth parameters
        ];
        
        const url = new URL(window.location);
        let hasParams = false;
        
        // Remove OAuth parameters
        oauthParams.forEach(param => {
            if (url.searchParams.has(param)) {
                url.searchParams.delete(param);
                hasParams = true;
            }
        });
        
        // Only update URL if we actually removed parameters
        if (hasParams) {
            const cleanUrl = url.toString();
            window.history.replaceState({}, document.title, cleanUrl);
            console.log('🧹 OAuth URL parameters cleaned up');
        } else {
            console.log('✅ URL already clean, no OAuth parameters found');
        }
        
    } catch (error) {
        console.warn('⚠️ Failed to clean up URL:', error);
        // Fallback to simple cleanup
        try {
            const cleanUrl = window.location.protocol + "//" + 
                            window.location.host + 
                            window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            console.log('🧹 Fallback URL cleanup completed');
        } catch (fallbackError) {
            console.error('❌ Failed fallback URL cleanup:', fallbackError);
        }
    }
}

// Clean up failed authentication state
function cleanupFailedAuth() {
    currentUser = null;
    isAuthenticated = false;
    
    try {
        localStorage.removeItem('derivlite_user');
        localStorage.removeItem('derivlite_token');
        localStorage.removeItem('derivlite_auth_time');
    } catch (error) {
        console.warn('⚠️ Failed to clean up storage:', error);
    }
    
    // Clean up URL
    cleanupOAuthUrl();
    
    // Show auth modal after a short delay
    setTimeout(() => {
        showAuthModal();
    }, 1000);
}

// Show welcome message with user data
function showWelcomeMessage(userData) {
    const accountTypeLabel = userData.isVirtual ? 'Virtual Account' : 'Real Account';
    const accountsCount = userData.allAccounts ? userData.allAccounts.length : 1;
    const displayName = getDisplayName(userData.name);
    
    // Populate the welcome modal with user data
    const welcomeUserInfo = document.getElementById('welcome-user-info');
    if (welcomeUserInfo) {
        let infoHTML = `
            <div class="welcome-info-item">
                <span class="welcome-info-label">Name:</span>
                <span class="welcome-info-value">${displayName}</span>
            </div>
            <div class="welcome-info-item">
                <span class="welcome-info-label">Account:</span>
                <span class="welcome-info-value">${userData.accountId} (${accountTypeLabel})</span>
            </div>
        `;
        
        if (userData.email !== 'Not available via OAuth') {
            infoHTML += `
                <div class="welcome-info-item">
                    <span class="welcome-info-label">Email:</span>
                    <span class="welcome-info-value">${userData.email}</span>
                </div>
            `;
        }
        
        if (userData.country && userData.country !== 'Unknown') {
            infoHTML += `
                <div class="welcome-info-item">
                    <span class="welcome-info-label">Country:</span>
                    <span class="welcome-info-value">${userData.country}</span>
                </div>
            `;
        }
        
        welcomeUserInfo.innerHTML = infoHTML;
    }
    
    // Show the welcome modal
    const welcomeModal = document.getElementById('welcome-modal');
    if (welcomeModal) {
        welcomeModal.style.display = 'flex';
        setTimeout(() => {
            welcomeModal.classList.add('show');
        }, 10);
    }
}

// Hide welcome modal
function hideWelcomeModal() {
    const welcomeModal = document.getElementById('welcome-modal');
    if (welcomeModal) {
        welcomeModal.classList.remove('show');
        setTimeout(() => {
            welcomeModal.style.display = 'none';
        }, 300);
    }
}

// Update user info in the header
function updateUserInfo(userData) {
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const userAccount = document.getElementById('user-account');
    
    if (userInfo && userName && userAccount) {
        const displayName = getDisplayName(userData.name) || userData.accountId;
        const accountLabel = userData.isVirtual ? 'Virtual' : 'Real';
        
        userName.textContent = displayName;
        userAccount.textContent = `${userData.accountId} (${accountLabel}) • ${userData.currency}`;
        userInfo.style.display = 'flex';
    }
}

// Check for existing authentication - DISABLED: Fresh login required on every page load
function checkExistingAuth() {
    // This function is disabled to force fresh login on every page load
    console.log('🚫 Auto-login disabled - fresh authentication required');
    return false;
    console.log('🔍 Checking for existing authentication...');
    
    const storedUser = localStorage.getItem('derivlite_user');
    const storedToken = localStorage.getItem('derivlite_token');
    const authTime = localStorage.getItem('derivlite_auth_time');
    
    console.log('📦 Stored auth data:', {
        hasUser: !!storedUser,
        hasToken: !!storedToken,
        hasAuthTime: !!authTime
    });
    
    if (storedUser && storedToken) {
        try {
            currentUser = JSON.parse(storedUser);
            
            // Apply name replacement for stored data (in case old data exists)
            if (currentUser.name) {
                currentUser.name = getDisplayName(currentUser.name);
            }
            if (currentUser.fullname) {
                currentUser.fullname = getDisplayName(currentUser.fullname);
            }
            
            console.log('👤 Stored user data:', {
                accountId: currentUser.accountId,
                email: currentUser.email,
                name: currentUser.name,
                hasAccess: currentUser.hasAccess
            });
            
            // Validate user data structure
            if (!currentUser.accountId || !currentUser.name) {
                throw new Error('Invalid stored user data structure');
            }
            
            // Check if login is still recent (12 hours instead of 24 for more frequent re-auth)
            const loginTime = new Date(authTime || currentUser.loginTime);
            const now = new Date();
            const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
            
            console.log(`⏰ Hours since login: ${hoursSinceLogin.toFixed(1)}`);
            
            if (hoursSinceLogin < 12) {
                // Check if user has valid email for potential re-validation
                if (currentUser.email && currentUser.email !== 'Not available via OAuth') {
                    console.log('✅ Valid session found with email - proceeding with auto-login');
                    
                    // Auto-login if recent and has email
                    isAuthenticated = true;
                    hideAuthModal();
                    updateUserInfo(currentUser);
                    
                    // Re-validate access on each load if user has paid access flag
                    if (currentUser.hasAccess) {
                        console.log('💳 User has paid access flag - starting application');
                        startWebSocket();
                        showNotification(`Welcome back, ${getDisplayName(currentUser.name)}!`, 'success');
                    } else {
                        console.log('🔍 Re-validating user access with database...');
                        // Re-validate against database
                        validateUserAccess(currentUser)
                            .then((hasAccess) => {
                                if (hasAccess) {
                                    startWebSocket();
                                    showNotification(`Welcome back, ${getDisplayName(currentUser.name)}!`, 'success');
                                } else {
                                    showPaymentModal();
                                }
                            })
                            .catch(() => {
                                showPaymentModal();
                            });
                    }
                    return true;
                } else {
                    console.log('⚠️ Valid session but no email - requiring fresh login');
                    logout();
                    return false;
                }
            } else {
                // Session expired
                console.log('⏰ Session expired, clearing stored data');
                logout();
                showNotification('Session expired. Please login again.', 'info');
                return false;
            }
        } catch (error) {
            console.error('❌ Error validating stored user data:', error);
            logout();
            showNotification('Invalid stored session. Please login again.', 'error');
            return false;
        }
    }
    
    console.log('❌ No valid authentication found');
    return false;
    
    return false;
}

// Logout function
function logout(showNotifications = true) {
    console.log('🚪 Logging out user:', currentUser?.accountId || 'unknown');
    
    // Clear user state
    currentUser = null;
    isAuthenticated = false;
    
    // Clear storage
    try {
        localStorage.removeItem('derivlite_user');
        localStorage.removeItem('derivlite_token');
        localStorage.removeItem('derivlite_auth_time');
        localStorage.removeItem('derivlite_return_url');
    } catch (error) {
        console.warn('⚠️ Error clearing storage during logout:', error);
    }
    
    // Hide user info
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.style.display = 'none';
    }
    
    // Close WebSocket if open
    if (derivWs) {
        try {
            derivWs.close();
            console.log('🔌 WebSocket connection closed');
        } catch (error) {
            console.warn('⚠️ Error closing WebSocket:', error);
        }
    }
    
    // Clear any timers or intervals
    if (predictionTimer) {
        clearInterval(predictionTimer);
        predictionTimer = null;
    }
    
    // Reset UI state
    try {
        updateConnectionStatus(false);
        
        // Clear market data
        Object.keys(marketsData).forEach(symbol => {
            marketsData[symbol] = {
                tickHistory: [],
                decimalPlaces: 2,
                processedTicks: 0,
                lastPrice: null,
                digitCounts: new Array(10).fill(0)
            };
        });
        
        // Reset counters
        totalProcessedTicks = 0;
        countdownSeconds = 0;
        currentPrediction = null;
        
    } catch (error) {
        console.warn('⚠️ Error resetting UI state:', error);
    }
    
    // Show success notification only if requested
    if (showNotifications) {
        showNotification('Logged out successfully', 'info');
    }
}

// Get current user data
function getCurrentUser() {
    return currentUser;
}

// Handle authentication errors and retry
function handleAuthRetry(errorMessage) {
    console.log('🔄 Handling authentication retry:', errorMessage);
    
    // Clear any existing auth state
    cleanupFailedAuth();
    
    // Show retry notification
    showNotification(errorMessage + ' Click to retry.', 'error', true, () => {
        showAuthModal();
    });
}

// Validate authentication state
function validateAuthState() {
    if (!isAuthenticated || !currentUser) {
        console.warn('⚠️ Invalid authentication state detected');
        handleAuthRetry('Authentication state invalid.');
        return false;
    }
    
    // Check if required user data is present
    if (!currentUser.accountId || !currentUser.name) {
        console.warn('⚠️ Incomplete user data detected');
        handleAuthRetry('User data incomplete.');
        return false;
    }
    
    // Check token presence
    const token = localStorage.getItem('derivlite_token');
    if (!token) {
        console.warn('⚠️ Authentication token missing');
        handleAuthRetry('Authentication token missing.');
        return false;
    }
    
    return true;
}

// Show notification system
function showNotification(message, type = 'info', clickable = false, onClick = null) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const iconMap = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="${iconMap[type] || iconMap.info}"></i>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 350px;
        z-index: 10001;
        animation: slideInRight 0.5s ease-out;
        cursor: ${clickable ? 'pointer' : 'default'};
    `;
    
    if (clickable && onClick) {
        notification.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-close')) {
                onClick();
                notification.remove();
            }
        });
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after delay (longer for errors)
    const delay = type === 'error' ? 8000 : 5000;
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.5s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }
    }, delay);
}

function hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.classList.add('hidden');
    
    // Remove from DOM after animation
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

function showAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

// Initialize auth modal on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DigitSnap initializing...');
    
    // Initialize market data
    initializeMarketData();
    
    // Force login on every page load - clear any existing authentication
    console.log('🔐 Forcing fresh login on page load...');
    
    // Clear any existing authentication data
    logout(false); // Don't show notification for this cleanup
    
    // Check for OAuth callback first
    if (handleOAuthCallback()) {
        console.log('✅ OAuth callback detected and processed');
        // OAuth callback was successful, user is being authenticated
        return;
    }
    
    // Always show login modal - no auto-login allowed
    console.log('🔑 Showing login modal - fresh authentication required');
    showAuthModal();
});

// Payment Modal Functions
function showPaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        // Update payment modal with user info if available
        updatePaymentModalWithUserInfo();
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function updatePaymentModalWithUserInfo() {
    if (!currentUser) return;
    
    // Update the payment modal header with user info
    const paymentHeader = document.querySelector('.payment-header p');
    if (paymentHeader && currentUser.email && currentUser.email !== 'Not available via OAuth') {
        paymentHeader.innerHTML = `Your account (${currentUser.email}) has been deactivated. Please make a payment to reactivate your account and access DigitSnap.`;
    }
}

function hidePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Clean up OAuth URL when hiding payment modal
        cleanupOAuthUrl();
        
        // Show auth modal again after hiding payment modal
        showAuthModal();
    }
}

function handlePayment(planType) {
    // For demo purposes, we'll simulate a payment process
    const planNames = {
        'lifetime': 'DigitSnap Access ($250 one-time payment)'
    };
    
    const planName = planNames[planType] || 'DigitSnap Access';
    
    // Show payment processing message
    const result = confirm(`You are about to purchase ${planName}.\n\nThis is a one-time payment for lifetime access to DigitSnap.\n\nIn a real implementation, this would redirect to a payment processor like Stripe, PayPal, or similar.\n\nFor this demo, would you like to simulate a successful payment?`);
    
    if (result) {
        // Show processing state
        const paymentBtn = document.querySelector('.btn.btn-primary.btn-full');
        if (paymentBtn) {
            paymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Payment...';
            paymentBtn.disabled = true;
        }
        
        // Simulate payment processing delay
        setTimeout(() => {
            // Simulate successful payment
            alert('Payment successful! Your account has been activated with lifetime access.\n\nStarting DigitSnap...');
            
            // In a real implementation, you would:
            // 1. Process payment with payment provider
            // 2. Update user's active status in database
            // 3. Create subscription record
            // 4. Send confirmation email
            // 5. Add user to the validated users list
            
            // For demo: Mark user as having paid access
            if (currentUser) {
                currentUser.hasAccess = true;
                currentUser.paymentDate = new Date().toISOString();
                currentUser.accessType = 'lifetime';
                localStorage.setItem('derivlite_user', JSON.stringify(currentUser));
                
                console.log('💳 Payment completed for user:', currentUser.email);
            }
            
            hidePaymentModal();
            
            // Clean up any OAuth parameters from URL after payment
            cleanupOAuthUrl();
            
            // Start the application
            setTimeout(() => {
                startWebSocket();
                showNotification('Welcome to DigitSnap! Your account is now active.', 'success');
            }, 500);
            
        }, 2000);
    }
}

// Close payment modal when clicking outside
document.addEventListener('click', function(event) {
    const paymentModal = document.getElementById('payment-modal');
    if (event.target === paymentModal) {
        // Allow closing payment modal to go back to auth
        hidePaymentModal();
    }
});

// Global payment method selection
let selectedPaymentMethod = 'usdt';

// Payment method selection
function selectPaymentMethod(method, button) {
    selectedPaymentMethod = method;
    
    // Update active state
    document.querySelectorAll('.payment-option').forEach(option => {
        option.classList.remove('active');
    });
    button.classList.add('active');
    
    // Update payment button text
    const paymentButtonText = document.getElementById('payment-button-text');
    if (paymentButtonText) {
        paymentButtonText.textContent = 'Pay with USDT - $250';
    }
}

// Handle payment - direct to Binance Pay link
function handlePayment(plan) {
    // Track the payment click
    console.log('🔗 Redirecting to Binance payment link');
    
    // Open Binance payment link directly
    window.open('https://s.binance.com/cOLwTZjQ', '_blank');
    
    // Optional: Show a small confirmation message
    setTimeout(() => {
        alert('You will be redirected to Binance to complete your $250 USDT payment. After payment, your account will be activated automatically.');
    }, 500);
}

// USDT Modal functions

// Demo payment options for development
function showDemoPaymentOptions(orderData) {
    const demoModal = `
        <div id="demo-payment-modal" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.95); z-index: 10003; 
            display: flex; justify-content: center; align-items: center;
        ">
            <div style="
                background: linear-gradient(145deg, #1a1a1a, #000000); 
                padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; 
                text-align: center; border: 2px solid #f0b90b;
            ">
                <h2 style="color: #f0b90b; margin-bottom: 20px;">
                    <i class="fas fa-code"></i> Demo Mode
                </h2>
                <p style="color: #fff; margin-bottom: 20px;">
                    This is development mode. In production, you would be redirected to Binance Pay.
                </p>
                <div style="background: rgba(240, 185, 11, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <p style="color: #f0b90b; margin: 0;">
                        <strong>Order ID:</strong> ${orderData.merchantTradeNo}
                    </p>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="simulateSuccessfulPayment('${orderData.merchantTradeNo}')" 
                            style="background: #00ff00; color: #000; padding: 12px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-check"></i> Simulate Success
                    </button>
                    <button onclick="closeDemoModal()" 
                            style="background: #ff0000; color: #fff; padding: 12px 20px; border: none; border-radius: 8px; cursor: pointer;">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', demoModal);
}

function closeDemoModal() {
    const modal = document.getElementById('demo-payment-modal');
    if (modal) modal.remove();
}

async function simulateSuccessfulPayment(merchantTradeNo) {
    try {
        // For demo purposes, simulate successful payment locally
        console.log('Demo payment simulation for order:', merchantTradeNo);
        
        // Close any open modals
        closeDemoModal();
        closeBinanceModal();
        
        // Show success message
        alert('🎉 Demo payment successful!\n\nYour account has been activated with lifetime access to DigitSnap!');
        
        // Activate DigitSnap immediately
        hidePaymentModal();
        isAuthenticated = true;
        startWebSocket();
        
        // Clear temporary order data
        localStorage.removeItem('currentOrder');
    } catch (error) {
        console.error('Demo payment error:', error);
        alert('Failed to simulate payment success.');
    }
}

// Monitor payment status - simplified for demo
async function monitorPaymentStatus(merchantTradeNo) {
    console.log('Demo payment monitoring for:', merchantTradeNo);
    
    // For demo purposes, automatically simulate success after 10 seconds
    setTimeout(() => {
        alert('🎉 Payment verified!\n\nYour account has been activated with lifetime access to DigitSnap!');
        closeBinanceModal();
        hidePaymentModal();
        isAuthenticated = true;
        startWebSocket();
        localStorage.removeItem('currentOrder');
    }, 10000);
    
    // Show monitoring message
    alert('💳 Monitoring payment status...\nWe will notify you once payment is confirmed.');
}

// Get current user info from login state
function getCurrentUserInfo() {
    try {
        const authData = localStorage.getItem('authData');
        if (authData) {
            return JSON.parse(authData);
        }
        
        // Fallback to form data if available
        const emailField = document.getElementById('email');
        const nameField = document.getElementById('name') || document.getElementById('username');
        
        return {
            email: emailField?.value || 'customer@example.com',
            name: nameField?.value || 'DigitSnap Customer',
            id: null
        };
    } catch (error) {
        return {
            email: 'customer@example.com',
            name: 'DigitSnap Customer',
            id: null
        };
    }
}

function confirmBinancePayment() {
    const currentOrder = JSON.parse(localStorage.getItem('currentOrder') || '{}');
    
    if (currentOrder.merchantTradeNo) {
        monitorPaymentStatus(currentOrder.merchantTradeNo);
        closeBinanceModal();
        alert('Thank you! We are checking your payment status. You will be notified once the payment is confirmed.');
    } else {
        alert('No active payment order found. Please try creating a new payment.');
    }
}

// USDT Modal functions
function openUSDTModal() {
    document.getElementById('usdtModal').style.display = 'block';
}

function closeUSDTModal() {
    document.getElementById('usdtModal').style.display = 'none';
}

function trackPaymentClick() {
    console.log('🔗 Binance payment link clicked');
    // You can add analytics tracking here if needed
}

function copyWalletAddress() {
    const walletInput = document.getElementById('walletAddress');
    walletInput.select();
    walletInput.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(walletInput.value).then(() => {
        const copyBtn = document.querySelector('.copy-btn');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyBtn.style.background = '#00ff00';
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.background = '#f0b90b';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        // Fallback for older browsers
        alert('Please manually copy the wallet address: ' + walletInput.value);
    });
}

function confirmUSDTPayment() {
    // Close USDT modal
    closeUSDTModal();
    
    // Show confirmation message
    alert('Thank you! Please wait for blockchain confirmation. Your account will be activated automatically once the payment is verified (usually 1-3 minutes).');
    
    // Here you would typically:
    // 1. Record the payment attempt in your backend
    // 2. Start monitoring the blockchain for the transaction
    // 3. Activate the account once payment is confirmed
    
    // For demo purposes, simulate account activation after a delay
    setTimeout(() => {
        const result = confirm('USDT payment confirmed on Binance Smart Chain!\n\nYour account has been activated with lifetime access.\n\nWould you like to start using DigitSnap now?');
        if (result) {
            hidePaymentModal();
            isAuthenticated = true;
            startWebSocket();
        }
    }, 3000);
}
