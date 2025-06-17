class SamDashboard {
    constructor() {
        this.currentNaics = 'all';
        this.currentOpportunities = [];
        this.filteredOpportunities = [];
        this.isLoading = false;
        this.apiBaseUrl = '/api';
        
        this.initializeEventListeners();
        this.loadInitialData();
    }

    initializeEventListeners() {
        // NAICS code navigation
        document.querySelectorAll('.naics-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const naicsCode = e.currentTarget.getAttribute('data-naics');
                this.selectNaics(naicsCode);
            });
        });

        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filterOpportunities();
                }, 300);
            });
        }

        // Date filters
        ['date-from', 'date-to', 'min-amount', 'max-amount'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.filterOpportunities();
                });
            }
        });

        // Sync button
        const syncButton = document.querySelector('[onclick="syncOpportunities()"]');
        if (syncButton) {
            syncButton.removeAttribute('onclick');
            syncButton.addEventListener('click', () => {
                this.syncOpportunities();
            });
        }
    }

    async loadInitialData() {
        this.showLoading();
        
        try {
            // Load opportunities and statistics in parallel
            await Promise.all([
                this.loadOpportunities(),
                this.loadStatistics(),
                this.loadNaicsCounts()
            ]);
            
            this.hideLoading();
            this.updateDisplay();
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showError('Failed to load dashboard data. Please refresh the page.');
        }
    }

    async loadOpportunities() {
        try {
            const url = this.currentNaics === 'all' 
                ? `${this.apiBaseUrl}/opportunities`
                : `${this.apiBaseUrl}/opportunities/naics/${this.currentNaics}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.currentOpportunities = data.opportunities || data || [];
            this.filteredOpportunities = [...this.currentOpportunities];
            
            console.log(`Loaded ${this.currentOpportunities.length} opportunities for NAICS ${this.currentNaics}`);
        } catch (error) {
            console.error('Failed to load opportunities:', error);
            this.currentOpportunities = [];
            this.filteredOpportunities = [];
        }
    }

    async loadStatistics() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/statistics`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const stats = await response.json();
            this.updateStatsDisplay(stats);
        } catch (error) {
            console.error('Failed to load statistics:', error);
            this.updateStatsDisplay({
                totalValue: 0,
                avgAward: 0,
                lastUpdated: 'Unknown'
            });
        }
    }

    async loadNaicsCounts() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/naics/statistics`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const naicsStats = await response.json();
            this.updateNaicsCounts(naicsStats);
        } catch (error) {
            console.error('Failed to load NAICS statistics:', error);
        }
    }

    selectNaics(naicsCode) {
        // Update active state
        document.querySelectorAll('.naics-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const selectedLink = document.querySelector(`[data-naics="${naicsCode}"]`);
        if (selectedLink) {
            selectedLink.classList.add('active');
        }

        this.currentNaics = naicsCode;
        this.loadOpportunities().then(() => {
            this.filterOpportunities();
        });
    }

    filterOpportunities() {
        const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
        const dateFrom = document.getElementById('date-from')?.value || '';
        const dateTo = document.getElementById('date-to')?.value || '';
        const minAmount = parseFloat(document.getElementById('min-amount')?.value || '0');
        const maxAmount = parseFloat(document.getElementById('max-amount')?.value || '0');

        this.filteredOpportunities = this.currentOpportunities.filter(opp => {
            // Search filter
            if (searchTerm && !this.matchesSearch(opp, searchTerm)) {
                return false;
            }

            // Date filters
            if (dateFrom && opp.postedDate && new Date(opp.postedDate) < new Date(dateFrom)) {
                return false;
            }
            if (dateTo && opp.postedDate && new Date(opp.postedDate) > new Date(dateTo + 'T23:59:59')) {
                return false;
            }

            // Amount filters
            const amount = opp.awardAmount || 0;
            if (minAmount > 0 && amount < minAmount) {
                return false;
            }
            if (maxAmount > 0 && amount > maxAmount) {
                return false;
            }

            return true;
        });

        this.updateDisplay();
    }

    matchesSearch(opportunity, searchTerm) {
        const searchFields = [
            opportunity.title,
            opportunity.description,
            opportunity.department,
            opportunity.solicitationNumber,
            opportunity.opportunityId
        ];

        return searchFields.some(field => 
            field && field.toLowerCase().includes(searchTerm)
        );
    }

    updateDisplay() {
        const container = document.getElementById('opportunities-container');
        if (!container) return;

        if (this.filteredOpportunities.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        const opportunitiesHTML = this.filteredOpportunities.map(opp => 
            this.getOpportunityCardHTML(opp)
        ).join('');

        container.innerHTML = `
            <div class="opportunities-grid">
                ${opportunitiesHTML}
            </div>
        `;
    }

    getOpportunityCardHTML(opportunity) {
        const postedDate = opportunity.postedDate ? 
            new Date(opportunity.postedDate).toLocaleDateString() : 'N/A';
        const responseDeadline = opportunity.responseDeadline ? 
            new Date(opportunity.responseDeadline).toLocaleDateString() : 'N/A';
        const awardAmount = opportunity.awardAmount ? 
            `$${opportunity.awardAmount.toLocaleString()}` : 'N/A';

        return `
            <div class="opportunity-card">
                <div class="opportunity-header">
                    <h3 class="opportunity-title">${this.escapeHtml(opportunity.title || 'Untitled Opportunity')}</h3>
                </div>
                
                <div class="opportunity-meta">
                    <span class="meta-badge">${this.escapeHtml(opportunity.opportunityType || 'Unknown Type')}</span>
                    <span class="meta-badge amount">${awardAmount}</span>
                    <span class="meta-badge deadline">Due: ${responseDeadline}</span>
                </div>
                
                <div class="opportunity-description">
                    ${this.escapeHtml(this.truncateText(opportunity.description || 'No description available', 150))}
                </div>
                
                <div class="opportunity-actions">
                    <div style="font-size: 12px; color: #718096;">
                        <div>Posted: ${postedDate}</div>
                        <div>Department: ${this.escapeHtml(opportunity.department || 'N/A')}</div>
                        ${opportunity.naicsCode ? `<div>NAICS: ${opportunity.naicsCode}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${opportunity.samUrl ? `
                            <a href="${opportunity.samUrl}" target="_blank" class="opportunity-link">
                                View on SAM.gov
                            </a>
                        ` : ''}
                        <button class="ai-button" onclick="analyzeOpportunity('${opportunity.opportunityId}')">
                            <i class="fas fa-robot"></i> AI Analysis
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3>No opportunities found</h3>
                <p>Try adjusting your filters or sync new data from SAM.gov</p>
            </div>
        `;
    }

    showLoading() {
        this.isLoading = true;
        const container = document.getElementById('opportunities-container');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Loading opportunities...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        this.isLoading = false;
    }

    showError(message) {
        const container = document.getElementById('opportunities-container');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon" style="color: #e53e3e;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Error Loading Data</h3>
                    <p>${this.escapeHtml(message)}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-refresh"></i> Refresh Page
                    </button>
                </div>
            `;
        }
    }

    updateStatsDisplay(stats) {
        const totalValueEl = document.getElementById('total-value');
        const avgAwardEl = document.getElementById('avg-award');
        const lastUpdatedEl = document.getElementById('last-updated');

        if (totalValueEl) {
            totalValueEl.textContent = stats.totalValue ? 
                `$${stats.totalValue.toLocaleString()}` : '$--';
        }
        
        if (avgAwardEl) {
            avgAwardEl.textContent = stats.avgAward ? 
                `$${stats.avgAward.toLocaleString()}` : '$--';
        }
        
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = stats.lastUpdated || '--';
        }
    }

    updateNaicsCounts(naicsStats) {
        // Update total count
        const totalCount = naicsStats.reduce((sum, stat) => sum + (stat.count || 0), 0);
        const allCountEl = document.getElementById('count-all');
        if (allCountEl) {
            allCountEl.textContent = totalCount.toString();
        }

        // Update individual NAICS counts
        naicsStats.forEach(stat => {
            const countEl = document.getElementById(`count-${stat.naicsCode}`);
            if (countEl) {
                countEl.textContent = (stat.count || 0).toString();
            }
        });
    }

    async syncOpportunities() {
        const syncButton = document.querySelector('[onclick*="syncOpportunities"]') || 
                          document.querySelector('button:contains("Sync Data")');
        
        if (syncButton) {
            const originalText = syncButton.innerHTML;
            syncButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
            syncButton.disabled = true;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    naicsCodes: ['236210', '236220', '237110', '237130', '237310', '237990'],
                    postedFrom: '2025-01-01',
                    postedTo: '2025-06-16'
                })
            });

            if (!response.ok) {
                throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showSyncSuccess(result);
                // Reload data after successful sync
                await this.loadInitialData();
            } else {
                throw new Error(result.errors?.join(', ') || 'Sync failed');
            }
        } catch (error) {
            console.error('Sync failed:', error);
            this.showSyncError(error.message);
        } finally {
            if (syncButton) {
                syncButton.innerHTML = '<i class="fas fa-sync-alt"></i> Sync Data';
                syncButton.disabled = false;
            }
        }
    }

    showSyncSuccess(result) {
        const message = `
            Sync completed successfully!
            <br>Records processed: ${result.recordsProcessed}
            <br>Records created: ${result.recordsCreated}
            <br>Records updated: ${result.recordsUpdated}
        `;
        this.showNotification(message, 'success');
    }

    showSyncError(message) {
        this.showNotification(`Sync failed: ${message}`, 'error');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div style="padding: 12px 16px; border-radius: 8px; margin: 16px; position: fixed; top: 20px; right: 20px; z-index: 1000; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                    <span>${message}</span>
                </div>
            </div>
        `;

        // Style based on type
        const colors = {
            success: { bg: '#f0fff4', border: '#68d391', text: '#22543d' },
            error: { bg: '#fed7d7', border: '#fc8181', text: '#742a2a' },
            info: { bg: '#ebf8ff', border: '#4299e1', text: '#2a4365' }
        };

        const color = colors[type] || colors.info;
        notification.style.backgroundColor = color.bg;
        notification.style.borderLeft = `4px solid ${color.border}`;
        notification.style.color = color.text;

        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}

// Global functions for onclick handlers
window.analyzeOpportunity = async function(opportunityId) {
    console.log('Analyzing opportunity:', opportunityId);
    
    try {
        const response = await fetch(`/api/opportunities/${opportunityId}/analyze`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`Analysis failed: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            alert('AI analysis completed! Check the console for details.');
            console.log('AI Analysis Result:', result.analysis);
        } else {
            alert(`Analysis failed: ${result.error}`);
        }
    } catch (error) {
        console.error('Failed to analyze opportunity:', error);
        alert(`Analysis failed: ${error.message}`);
    }
};

window.syncOpportunities = function() {
    if (window.dashboard) {
        window.dashboard.syncOpportunities();
    }
};

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new SamDashboard();
});