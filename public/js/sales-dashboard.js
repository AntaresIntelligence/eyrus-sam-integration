class SalesDashboard {
    constructor() {
        this.currentOpportunities = [];
        this.filteredOpportunities = [];
        this.selectedOpportunities = [];
        this.currentFilters = {
            search: '',
            priority: '',
            minValue: null,
            projectType: '',
            timeframe: 90
        };
        this.apiBaseUrl = '/api/sales';
        
        this.initializeEventListeners();
        this.loadDashboardData();
    }

    initializeEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = e.target.value;
                    this.filterOpportunities();
                }, 300);
            });
        }

        // Filter controls
        ['priority-filter', 'value-filter', 'type-filter', 'timeframe-filter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    this.handleFilterChange(id, e.target.value);
                });
            }
        });

        // Set initial timeframe
        const timeframeFilter = document.getElementById('timeframe-filter');
        if (timeframeFilter) {
            this.currentFilters.timeframe = parseInt(timeframeFilter.value, 10);
        }
    }

    handleFilterChange(filterId, value) {
        switch (filterId) {
            case 'priority-filter':
                this.currentFilters.priority = value;
                break;
            case 'value-filter':
                this.currentFilters.minValue = value ? parseInt(value, 10) : null;
                break;
            case 'type-filter':
                this.currentFilters.projectType = value;
                break;
            case 'timeframe-filter':
                this.currentFilters.timeframe = parseInt(value, 10);
                this.loadDashboardData(); // Reload data for timeframe changes
                return;
        }
        this.filterOpportunities();
    }

    async loadDashboardData() {
        try {
            this.showLoading();

            // Load dashboard summary and opportunities
            const [dashboardData, opportunitiesData] = await Promise.all([
                this.fetchDashboardSummary(),
                this.fetchOpportunities()
            ]);

            this.updateMetrics(dashboardData);
            this.currentOpportunities = opportunitiesData.opportunities || [];
            this.filterOpportunities();

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showError('Failed to load dashboard data. Please refresh the page.');
        }
    }

    async fetchDashboardSummary() {
        const response = await fetch(`${this.apiBaseUrl}/dashboard?timeframe=${this.currentFilters.timeframe}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }

    async fetchOpportunities() {
        const params = new URLSearchParams({
            limit: '100',
            minValue: '100000', // Only show $100K+ opportunities
        });

        if (this.currentFilters.timeframe) {
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - this.currentFilters.timeframe);
            params.append('dateFrom', dateFrom.toISOString().split('T')[0]);
        }

        const response = await fetch(`${this.apiBaseUrl}/opportunities?${params}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }

    updateMetrics(dashboardData) {
        const summary = dashboardData.data?.summary || {};
        
        // Update metric values
        document.getElementById('total-qualified').textContent = 
            summary.totalQualifiedOpportunities?.toLocaleString() || '--';
        document.getElementById('high-priority').textContent = 
            summary.highPriorityCount?.toLocaleString() || '--';
        document.getElementById('total-value').textContent = 
            summary.totalValue ? `$${(summary.totalValue / 1000000).toFixed(1)}M` : '--';
        document.getElementById('avg-value').textContent = 
            summary.avgValue ? `$${(summary.avgValue / 1000).toFixed(0)}K` : '--';

        // Update change indicators (placeholder for now)
        document.getElementById('qualified-change').textContent = 'New data';
        document.getElementById('priority-change').textContent = `${summary.timeframe || 'Recent'}`;
        document.getElementById('value-change').textContent = 'Total pipeline';
        document.getElementById('avg-change').textContent = 'Per contract';
    }

    filterOpportunities() {
        this.filteredOpportunities = this.currentOpportunities.filter(opp => {
            // Search filter
            if (this.currentFilters.search) {
                const searchTerm = this.currentFilters.search.toLowerCase();
                const searchableText = `${opp.title} ${opp.awardeeName} ${opp.department}`.toLowerCase();
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }

            // Priority filter
            if (this.currentFilters.priority && opp.priority !== this.currentFilters.priority) {
                return false;
            }

            // Value filter
            if (this.currentFilters.minValue && (opp.awardAmount || 0) < this.currentFilters.minValue) {
                return false;
            }

            // Project type filter
            if (this.currentFilters.projectType) {
                const projectText = `${opp.title} ${opp.description || ''}`.toLowerCase();
                if (!projectText.includes(this.currentFilters.projectType.toLowerCase())) {
                    return false;
                }
            }

            return true;
        });

        this.displayOpportunities();
    }

    displayOpportunities() {
        const container = document.getElementById('opportunities-list');
        if (!container) return;

        if (this.filteredOpportunities.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        // Sort by sales score (highest first)
        const sortedOpportunities = [...this.filteredOpportunities].sort((a, b) => 
            (b.salesScore || 0) - (a.salesScore || 0)
        );

        const opportunitiesHTML = sortedOpportunities.map(opp => 
            this.getOpportunityCardHTML(opp)
        ).join('');

        container.innerHTML = opportunitiesHTML;

        // Attach event listeners for checkboxes
        this.attachCheckboxListeners();
    }

    getOpportunityCardHTML(opportunity) {
        const priorityClass = `priority-${opportunity.priority || 'medium'}`;
        const scorePercentage = Math.min((opportunity.salesScore || 0), 100);
        
        const awardAmount = opportunity.awardAmount ? 
            `$${(opportunity.awardAmount / 1000000).toFixed(1)}M` : 'N/A';
        
        const postedDate = opportunity.postedDate ? 
            new Date(opportunity.postedDate).toLocaleDateString() : 'N/A';

        return `
            <div class="opportunity-card" data-id="${opportunity.id}">
                <input type="checkbox" class="opportunity-checkbox" data-id="${opportunity.id}">
                
                <div class="opportunity-header">
                    <div class="opportunity-main">
                        <h3 class="opportunity-title">${this.escapeHtml(opportunity.title)}</h3>
                        
                        <div class="opportunity-meta">
                            <div class="meta-item">
                                <i class="fas fa-building meta-icon"></i>
                                <span>${this.escapeHtml(opportunity.awardeeName || 'Unknown Awardee')}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-dollar-sign meta-icon"></i>
                                <span>${awardAmount}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-calendar meta-icon"></i>
                                <span>Posted ${postedDate}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-tag meta-icon"></i>
                                <span>${this.escapeHtml(opportunity.projectType || 'General')}</span>
                            </div>
                        </div>

                        <div class="sales-score">
                            <span class="score-value">${scorePercentage}/100</span>
                            <div class="score-bar">
                                <div class="score-fill" style="width: ${scorePercentage}%"></div>
                            </div>
                            <span class="priority-badge ${priorityClass}">
                                ${(opportunity.priority || 'medium').toUpperCase()} PRIORITY
                            </span>
                        </div>

                        ${this.getAwardeeInfoHTML(opportunity)}

                        <div class="opportunity-actions">
                            <a href="#" class="action-btn primary" onclick="viewOpportunityDetails('${opportunity.id}')">
                                <i class="fas fa-eye"></i>
                                View Details
                            </a>
                            <a href="#" class="action-btn secondary" onclick="analyzeOpportunity('${opportunity.id}')">
                                <i class="fas fa-robot"></i>
                                AI Analysis
                            </a>
                            <a href="#" class="action-btn secondary" onclick="generateContactStrategy('${opportunity.id}')">
                                <i class="fas fa-phone"></i>
                                Contact Strategy
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getAwardeeInfoHTML(opportunity) {
        if (!opportunity.awardeeName) {
            return '';
        }

        // Extract potential contact info
        const contacts = opportunity.keyContacts || [];
        const contactsHTML = contacts.length > 0 ? 
            contacts.slice(0, 2).map(contact => `
                <div>
                    <strong>${this.escapeHtml(contact.name || 'Contact')}</strong><br>
                    ${this.escapeHtml(contact.title || 'N/A')} • ${this.escapeHtml(contact.email || 'N/A')}
                </div>
            `).join('') : 
            `<div><em>Contact information to be researched</em></div>`;

        return `
            <div class="awardee-info">
                <div class="awardee-name">
                    <i class="fas fa-award"></i>
                    Awarded to: ${this.escapeHtml(opportunity.awardeeName)}
                </div>
                <div class="contact-info">
                    ${contactsHTML}
                </div>
            </div>
        `;
    }

    attachCheckboxListeners() {
        const checkboxes = document.querySelectorAll('.opportunity-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const opportunityId = e.target.getAttribute('data-id');
                const card = document.querySelector(`[data-id="${opportunityId}"]`);
                
                if (e.target.checked) {
                    this.selectedOpportunities.push(opportunityId);
                    card.classList.add('selected');
                } else {
                    this.selectedOpportunities = this.selectedOpportunities.filter(id => id !== opportunityId);
                    card.classList.remove('selected');
                }
                
                this.updateSelectionDisplay();
            });
        });
    }

    updateSelectionDisplay() {
        const selectedCount = document.getElementById('selected-count');
        const selectedNumber = document.getElementById('selected-number');
        const analyzeBtn = document.getElementById('analyze-btn');

        if (this.selectedOpportunities.length > 0) {
            selectedCount.style.display = 'block';
            analyzeBtn.style.display = 'flex';
            selectedNumber.textContent = this.selectedOpportunities.length;
        } else {
            selectedCount.style.display = 'none';
            analyzeBtn.style.display = 'none';
        }
    }

    showLoading() {
        const container = document.getElementById('opportunities-list');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Loading high-value opportunities...</p>
                </div>
            `;
        }
    }

    showError(message) {
        const container = document.getElementById('opportunities-list');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
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

    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-search-dollar"></i>
                </div>
                <h3>No opportunities match your criteria</h3>
                <p>Try adjusting your filters or search terms to find relevant contracts.</p>
            </div>
        `;
    }

    // Utility functions
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Analysis functions
    async performBulkAnalysis(opportunityIds, analysisType = 'sales_potential') {
        try {
            const response = await fetch(`${this.apiBaseUrl}/analyze/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    opportunityIds,
                    analysisType,
                }),
            });

            if (!response.ok) {
                throw new Error(`Analysis failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Bulk analysis failed:', error);
            throw error;
        }
    }
}

// Global functions for onclick handlers
window.viewOpportunityDetails = function(opportunityId) {
    // TODO: Open opportunity detail modal or page
    window.open(`/opportunity/${opportunityId}`, '_blank');
};

window.analyzeOpportunity = async function(opportunityId) {
    try {
        const result = await window.salesDashboard.performBulkAnalysis([opportunityId], 'sales_potential');
        if (result.success && result.results.length > 0) {
            alert('AI analysis completed! Check the console for details.');
            console.log('AI Analysis Result:', result.results[0]);
        } else {
            alert('Analysis failed or returned no results.');
        }
    } catch (error) {
        alert(`Analysis failed: ${error.message}`);
    }
};

window.generateContactStrategy = async function(opportunityId) {
    try {
        const result = await window.salesDashboard.performBulkAnalysis([opportunityId], 'contact_strategy');
        if (result.success && result.results.length > 0) {
            alert('Contact strategy generated! Check the console for details.');
            console.log('Contact Strategy:', result.results[0]);
        } else {
            alert('Strategy generation failed or returned no results.');
        }
    } catch (error) {
        alert(`Strategy generation failed: ${error.message}`);
    }
};

window.analyzeSelected = async function() {
    if (window.salesDashboard.selectedOpportunities.length === 0) {
        alert('Please select opportunities to analyze.');
        return;
    }

    try {
        const result = await window.salesDashboard.performBulkAnalysis(
            window.salesDashboard.selectedOpportunities,
            'sales_potential'
        );
        
        if (result.success) {
            alert(`Bulk analysis completed for ${result.results.length} opportunities!`);
            console.log('Bulk Analysis Results:', result);
        } else {
            alert('Bulk analysis failed.');
        }
    } catch (error) {
        alert(`Bulk analysis failed: ${error.message}`);
    }
};

window.openBulkAnalysis = function() {
    // TODO: Open bulk analysis modal
    alert('Bulk analysis feature coming soon!');
};

window.exportSelected = function() {
    if (window.salesDashboard.selectedOpportunities.length === 0) {
        alert('Please select opportunities to export.');
        return;
    }
    
    // TODO: Implement export functionality
    alert(`Exporting ${window.salesDashboard.selectedOpportunities.length} selected opportunities...`);
};

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.salesDashboard = new SalesDashboard();
});