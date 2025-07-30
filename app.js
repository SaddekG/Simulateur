// Simulateur VAN | TRI | ROI | DR – réalisé par GRIDI SADDEK
// Version extensible avec ajout/suppression d'années fonctionnel

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        minYears: 3,
        maxYears: 30,
        defaultYears: 7,
        defaultInvestment: 1000000,
        defaultRate: 10,
        exampleFlows: [250000, 300000, 350000, 320000, 280000, 200000, 150000]
    };

    // Variables globales
    let currentYears = CONFIG.defaultYears;
    let elements = {};

    // ============================
    // UTILITAIRES DE FORMATAGE
    // ============================
    const formatCurrency = (value) => {
        if (!Number.isFinite(value)) return '—';
        return `${Math.round(value).toLocaleString('fr-FR')} DZD`;
    };

    const formatPercent = (value) => {
        if (!Number.isFinite(value)) return '—';
        return `${(value * 100).toFixed(2)} %`;
    };

    // ============================
    // FONCTIONS FINANCIÈRES
    // ============================
    
    function calculateNPV(rate, investment, flows) {
        const discountRate = rate / 100;
        let npv = -investment;
        
        for (let i = 0; i < flows.length; i++) {
            npv += flows[i] / Math.pow(1 + discountRate, i + 1);
        }
        
        return npv;
    }

    function calculateIRR(investment, flows) {
        const maxIterations = 100;
        const tolerance = 1e-6;
        let lowRate = -0.99;
        let highRate = 5.0;
        
        const npvAtRate = (rate) => {
            let npv = -investment;
            for (let i = 0; i < flows.length; i++) {
                npv += flows[i] / Math.pow(1 + rate, i + 1);
            }
            return npv;
        };

        if (npvAtRate(lowRate) * npvAtRate(highRate) > 0) {
            return NaN;
        }

        let iterations = 0;
        while (iterations < maxIterations && (highRate - lowRate) > tolerance) {
            const midRate = (lowRate + highRate) / 2;
            const npvMid = npvAtRate(midRate);
            
            if (Math.abs(npvMid) < tolerance) {
                return midRate;
            }
            
            if (npvAtRate(lowRate) * npvMid < 0) {
                highRate = midRate;
            } else {
                lowRate = midRate;
            }
            
            iterations++;
        }
        
        return (lowRate + highRate) / 2;
    }

    function calculateROI(investment, flows) {
        const totalFlows = flows.reduce((sum, flow) => sum + flow, 0);
        return (totalFlows - investment) / investment;
    }

    function calculateDiscountedPayback(investment, flows, rate) {
        const discountRate = rate / 100;
        let cumulativeDiscountedFlow = 0;
        
        for (let i = 0; i < flows.length; i++) {
            const discountedFlow = flows[i] / Math.pow(1 + discountRate, i + 1);
            cumulativeDiscountedFlow += discountedFlow;
            
            if (cumulativeDiscountedFlow >= investment) {
                const previousCumulative = cumulativeDiscountedFlow - discountedFlow;
                const fraction = (investment - previousCumulative) / discountedFlow;
                return i + fraction;
            }
        }
        
        return NaN;
    }

    function convertToYearsMonths(decimalYears) {
        if (!Number.isFinite(decimalYears)) {
            return 'Non récupérable';
        }
        
        const years = Math.floor(decimalYears);
        const months = Math.round((decimalYears - years) * 12);
        
        if (months === 12) {
            return `${years + 1} ${years + 1 === 1 ? 'an' : 'ans'}`;
        }
        
        let result = '';
        if (years > 0) {
            result += `${years} ${years === 1 ? 'an' : 'ans'}`;
        }
        if (months > 0) {
            if (result) result += ' et ';
            result += `${months} mois`;
        }
        
        return result || '0 mois';
    }

    // ============================
    // GESTION DYNAMIQUE DES ANNÉES
    // ============================
    
    function getCurrentFlowValues() {
        const flows = {};
        for (let i = 1; i <= currentYears; i++) {
            const input = document.getElementById(`cf${i}`);
            if (input && input.value !== '') {
                flows[i] = input.value;
            }
        }
        return flows;
    }

    function generateCashflowFields() {
        const grid = elements.cashflowGrid;
        if (!grid) return;
        
        // Sauvegarder les valeurs actuelles
        const savedValues = getCurrentFlowValues();
        
        // Vider la grille
        grid.innerHTML = '';
        
        // Créer les nouveaux champs
        for (let i = 1; i <= currentYears; i++) {
            const item = document.createElement('div');
            item.className = 'cashflow-item';
            
            // Déterminer la valeur par défaut
            let defaultValue = '';
            if (savedValues[i] !== undefined) {
                defaultValue = savedValues[i];
            } else if (i <= CONFIG.exampleFlows.length) {
                defaultValue = CONFIG.exampleFlows[i - 1];
            }
            
            item.innerHTML = `
                <label for="cf${i}" class="form-label">Année ${i} (DZD)</label>
                <input type="number" id="cf${i}" class="form-control" value="${defaultValue}" step="1000" />
            `;
            
            grid.appendChild(item);
        }
        
        updateYearControls();
        addCashflowInputListeners();
    }

    function updateYearControls() {
        if (elements.yearCount) {
            elements.yearCount.textContent = currentYears;
        }
        
        if (elements.addYearBtn) {
            elements.addYearBtn.disabled = currentYears >= CONFIG.maxYears;
        }
        
        if (elements.removeYearBtn) {
            elements.removeYearBtn.disabled = currentYears <= CONFIG.minYears;
        }
    }

    function addYear() {
        if (currentYears < CONFIG.maxYears) {
            currentYears++;
            generateCashflowFields();
            console.log(`Année ajoutée. Total: ${currentYears} années`);
        }
    }

    function removeYear() {
        if (currentYears > CONFIG.minYears) {
            currentYears--;
            generateCashflowFields();
            console.log(`Année supprimée. Total: ${currentYears} années`);
        }
    }

    // ============================
    // INTERPRÉTATIONS FINANCIÈRES
    // ============================
    
    function interpretNPV(npv) {
        if (npv > 0) {
            return {
                text: "✅ VAN POSITIVE - Projet rentable. L'investissement créera de la valeur économique.",
                class: 'positive'
            };
        } else if (npv === 0) {
            return {
                text: "⚖️ VAN NULLE - Projet à l'équilibre. Aucune création ni destruction de valeur.",
                class: 'warning'
            };
        } else {
            return {
                text: "❌ VAN NÉGATIVE - Projet non rentable. L'investissement détruira de la valeur.",
                class: 'negative'
            };
        }
    }

    function interpretIRR(irr, discountRate) {
        const rate = discountRate / 100;
        
        if (!Number.isFinite(irr)) {
            return {
                text: "❌ TRI NON CALCULABLE - Flux de trésorerie inadéquats",
                class: 'negative'
            };
        }
        
        if (irr > rate + 0.05) {
            return {
                text: "🚀 TRI EXCELLENT - Rentabilité très supérieure aux attentes",
                class: 'excellent'
            };
        } else if (irr > rate) {
            return {
                text: "✅ TRI SATISFAISANT - Rentabilité supérieure au taux requis",
                class: 'positive'
            };
        } else if (Math.abs(irr - rate) < 0.001) {
            return {
                text: "⚖️ TRI À L'ÉQUILIBRE - Rentabilité égale au taux requis",
                class: 'warning'
            };
        } else {
            return {
                text: "❌ TRI INSUFFISANT - Rentabilité inférieure au taux requis",
                class: 'negative'
            };
        }
    }

    function interpretROI(roi) {
        if (roi > 1.0) {
            return {
                text: "🚀 ROI EXCEPTIONNEL - Gains supérieurs à 100% de l'investissement",
                class: 'excellent'
            };
        } else if (roi > 0.5) {
            return {
                text: "✅ ROI TRÈS BON - Gains substantiels (>50%)",
                class: 'positive'
            };
        } else if (roi > 0.2) {
            return {
                text: "✅ ROI SATISFAISANT - Gains acceptables (>20%)",
                class: 'positive'
            };
        } else if (roi > 0) {
            return {
                text: "⚠️ ROI FAIBLE - Gains positifs mais modestes",
                class: 'warning'
            };
        } else {
            return {
                text: "❌ ROI NÉGATIF - Pertes sur l'investissement",
                class: 'negative'
            };
        }
    }

    function interpretDR(drYears) {
        if (!Number.isFinite(drYears)) {
            return {
                text: "❌ RÉCUPÉRATION IMPOSSIBLE - Flux insuffisants",
                class: 'negative'
            };
        }
        
        if (drYears <= 2) {
            return {
                text: "🚀 RÉCUPÉRATION TRÈS RAPIDE - Risque de liquidité très faible",
                class: 'excellent'
            };
        } else if (drYears <= 4) {
            return {
                text: "✅ RÉCUPÉRATION ACCEPTABLE - Risque de liquidité modéré",
                class: 'positive'
            };
        } else if (drYears <= 6) {
            return {
                text: "⚠️ RÉCUPÉRATION LENTE - Risque de liquidité élevé",
                class: 'warning'
            };
        } else {
            return {
                text: "❌ RÉCUPÉRATION TRÈS LENTE - Risque de liquidité très élevé",
                class: 'negative'
            };
        }
    }

    function getFinalRecommendation(npv, irr, roi, drYears, discountRate) {
        const rate = discountRate / 100;
        
        const strongCriteria = npv > 0 && irr > rate + 0.02 && roi > 0.3 && drYears <= 4;
        const standardCriteria = npv > 0 && irr > rate && roi > 0.2 && drYears <= 5;
        const studyCriteria = npv > 0;
        
        if (strongCriteria) {
            return {
                text: "🎯 PROJET FORTEMENT RECOMMANDÉ",
                class: 'highly-recommended'
            };
        } else if (standardCriteria) {
            return {
                text: "✅ PROJET RECOMMANDÉ",
                class: 'recommended'
            };
        } else if (studyCriteria) {
            return {
                text: "⚠️ PROJET À ÉTUDIER",
                class: 'study-needed'
            };
        } else {
            return {
                text: "❌ PROJET NON RECOMMANDÉ",
                class: 'not-recommended'
            };
        }
    }

    // ============================
    // VALIDATION ET CALCUL
    // ============================
    
    function getFlows() {
        const flows = [];
        let hasError = false;
        
        for (let i = 1; i <= currentYears; i++) {
            const input = document.getElementById(`cf${i}`);
            if (!input) continue;
            
            const value = parseFloat(input.value);
            if (isNaN(value)) {
                input.classList.add('invalid');
                hasError = true;
            } else {
                input.classList.remove('invalid');
                flows.push(value);
            }
        }
        
        return hasError ? null : flows;
    }

    function validateInputs() {
        let isValid = true;
        
        // Validation investissement
        if (elements.investment) {
            const investment = parseFloat(elements.investment.value);
            if (isNaN(investment) || investment <= 0) {
                elements.investment.classList.add('invalid');
                isValid = false;
            } else {
                elements.investment.classList.remove('invalid');
            }
        }
        
        // Validation taux
        if (elements.rate) {
            const rate = parseFloat(elements.rate.value);
            if (isNaN(rate) || rate < 0) {
                elements.rate.classList.add('invalid');
                isValid = false;
            } else {
                elements.rate.classList.remove('invalid');
            }
        }
        
        // Validation flux
        const flows = getFlows();
        if (!flows) {
            isValid = false;
        }
        
        return isValid;
    }

    function calculate() {
        if (elements.errorMessage) {
            elements.errorMessage.classList.add('hidden');
        }
        
        if (!validateInputs()) {
            if (elements.errorMessage) {
                elements.errorMessage.textContent = "Veuillez corriger les erreurs de saisie.";
                elements.errorMessage.classList.remove('hidden');
            }
            return;
        }
        
        const investment = parseFloat(elements.investment.value);
        const rate = parseFloat(elements.rate.value);
        const flows = getFlows();
        
        if (!flows) return;
        
        try {
            const npv = calculateNPV(rate, investment, flows);
            const irr = calculateIRR(investment, flows);
            const roi = calculateROI(investment, flows);
            const drYears = calculateDiscountedPayback(investment, flows, rate);
            
            // Affichage VAN
            const npvInterpretation = interpretNPV(npv);
            if (elements.vanValue) {
                elements.vanValue.textContent = formatCurrency(npv);
                elements.vanValue.className = `result-value ${npvInterpretation.class}`;
            }
            if (elements.vanInterpretation) {
                elements.vanInterpretation.textContent = npvInterpretation.text;
                elements.vanInterpretation.className = `result-interpretation ${npvInterpretation.class}`;
            }
            
            // Affichage TRI
            const irrInterpretation = interpretIRR(irr, rate);
            if (elements.triValue) {
                elements.triValue.textContent = formatPercent(irr);
                elements.triValue.className = `result-value ${irrInterpretation.class}`;
            }
            if (elements.triInterpretation) {
                elements.triInterpretation.textContent = irrInterpretation.text;
                elements.triInterpretation.className = `result-interpretation ${irrInterpretation.class}`;
            }
            
            // Affichage ROI
            const roiInterpretation = interpretROI(roi);
            if (elements.roiValue) {
                elements.roiValue.textContent = formatPercent(roi);
                elements.roiValue.className = `result-value ${roiInterpretation.class}`;
            }
            if (elements.roiInterpretation) {
                elements.roiInterpretation.textContent = roiInterpretation.text;
                elements.roiInterpretation.className = `result-interpretation ${roiInterpretation.class}`;
            }
            
            // Affichage DR
            const drInterpretation = interpretDR(drYears);
            if (elements.drValue) {
                elements.drValue.textContent = convertToYearsMonths(drYears);
                elements.drValue.className = `result-value ${drInterpretation.class}`;
            }
            if (elements.drInterpretation) {
                elements.drInterpretation.textContent = drInterpretation.text;
                elements.drInterpretation.className = `result-interpretation ${drInterpretation.class}`;
            }
            
            // Recommandation finale
            const recommendation = getFinalRecommendation(npv, irr, roi, drYears, rate);
            if (elements.finalRecommendation) {
                elements.finalRecommendation.textContent = recommendation.text;
                elements.finalRecommendation.className = `recommendation-text ${recommendation.class}`;
            }
            
        } catch (error) {
            console.error('Erreur de calcul:', error);
            if (elements.errorMessage) {
                elements.errorMessage.textContent = "Erreur lors du calcul. Veuillez vérifier vos données.";
                elements.errorMessage.classList.remove('hidden');
            }
        }
    }

    // ============================
    // ÉVÉNEMENTS ET INITIALISATION
    // ============================
    
    function addCashflowInputListeners() {
        for (let i = 1; i <= currentYears; i++) {
            const input = document.getElementById(`cf${i}`);
            if (input) {
                input.addEventListener('input', () => {
                    input.classList.remove('invalid');
                    if (elements.errorMessage) {
                        elements.errorMessage.classList.add('hidden');
                    }
                });
            }
        }
    }

    function initializeElements() {
        elements = {
            investment: document.getElementById('investment'),
            rate: document.getElementById('rate'),
            yearCount: document.getElementById('year-count'),
            addYearBtn: document.getElementById('add-year-btn'),
            removeYearBtn: document.getElementById('remove-year-btn'),
            cashflowGrid: document.getElementById('cashflow-grid'),
            calculateBtn: document.getElementById('calculate-btn'),
            vanValue: document.getElementById('van-value'),
            vanInterpretation: document.getElementById('van-interpretation'),
            triValue: document.getElementById('tri-value'),
            triInterpretation: document.getElementById('tri-interpretation'),
            roiValue: document.getElementById('roi-value'),
            roiInterpretation: document.getElementById('roi-interpretation'),
            drValue: document.getElementById('dr-value'),
            drInterpretation: document.getElementById('dr-interpretation'),
            finalRecommendation: document.getElementById('final-recommendation'),
            errorMessage: document.getElementById('error-message')
        };
    }

    function addEventListeners() {
        // Boutons d'ajout/suppression d'années
        if (elements.addYearBtn) {
            elements.addYearBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                addYear();
            });
        }
        
        if (elements.removeYearBtn) {
            elements.removeYearBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                removeYear();
            });
        }
        
        // Bouton de calcul
        if (elements.calculateBtn) {
            elements.calculateBtn.addEventListener('click', function(e) {
                e.preventDefault();
                calculate();
            });
        }
        
        // Inputs principaux
        if (elements.investment) {
            elements.investment.addEventListener('input', () => {
                elements.investment.classList.remove('invalid');
                if (elements.errorMessage) {
                    elements.errorMessage.classList.add('hidden');
                }
            });
        }
        
        if (elements.rate) {
            elements.rate.addEventListener('input', () => {
                elements.rate.classList.remove('invalid');
                if (elements.errorMessage) {
                    elements.errorMessage.classList.add('hidden');
                }
            });
        }
    }

    function initialize() {
        console.log('Initialisation du simulateur...');
        
        initializeElements();
        generateCashflowFields();
        addEventListeners();
        
        // Calcul initial après un délai
        setTimeout(() => {
            calculate();
        }, 100);
    }

    // Initialisation au chargement de la page
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();