/**
 * Chinese Remainder Theorem Calculator Logic
 */

// Math Utilities using BigInt for precision
function gcd(a, b) {
    a = BigInt(a);
    b = BigInt(b);
    while (b !== 0n) {
        let temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

function extendedGCD(a, b) {
    a = BigInt(a);
    b = BigInt(b);
    if (b === 0n) return [a, 1n, 0n];

    let x0 = 1n, y0 = 0n, x1 = 0n, y1 = 1n;
    while (b !== 0n) {
        let q = a / b;
        let r = a % b;
        
        a = b;
        b = r;
        
        let x2 = x0 - q * x1;
        let y2 = y0 - q * y1;
        
        x0 = x1;
        x1 = x2;
        y0 = y1;
        y1 = y2;
    }
    return [a, x0, y0];
}

function modInverse(a, m) {
    a = BigInt(a);
    m = BigInt(m);
    
    // a and m must be coprime (gcd = 1)
    let [g, x, y] = extendedGCD(a, m);
    if (g !== 1n) {
        return null; // Inverse doesn't exist
    } else {
        return (x % m + m) % m; // ensure positive
    }
}

// Check if array of moduli are pairwise coprime
function checkPairwiseCoprime(moduli) {
    for (let i = 0; i < moduli.length; i++) {
        for (let j = i + 1; j < moduli.length; j++) {
            if (gcd(moduli[i], moduli[j]) !== 1n) {
                return false;
            }
        }
    }
    return true;
}

// CRT Solver
function solveCRT(congruences) {
    const steps = [];
    let M = 1n;
    
    // Calculate total product M
    congruences.forEach(c => {
        M *= BigInt(c.m);
    });
    
    steps.push(`Total Product (M) = ${congruences.map(c => c.m).join(' × ')} = ${M}`);
    
    let totalX = 0n;
    let stepDetails = [];
    
    for (let i = 0; i < congruences.length; i++) {
        let a = BigInt(congruences[i].a);
        let m = BigInt(congruences[i].m);
        let Mi = M / m;
        
        let yi = modInverse(Mi, m);
        if (yi === null) {
            throw new Error(`Failed to find modular inverse for M_${i + 1} mod m_${i + 1}`);
        }
        
        stepDetails.push({
            a: a.toString(),
            m: m.toString(),
            Mi: Mi.toString(),
            yi: yi.toString(),
            product: (a * Mi * yi).toString()
        });
        
        totalX += (a * Mi * yi);
    }
    
    steps.push(`M<sub>i</sub> = M / m<sub>i</sub> computations:`);
    stepDetails.forEach((d, i) => {
        steps.push(`M<sub>${i+1}</sub> = ${M} / ${d.m} = ${d.Mi}`);
    });
    
    steps.push(`y<sub>i</sub> = (M<sub>i</sub>)<sup>-1</sup> mod m<sub>i</sub> modular inverses:`);
    stepDetails.forEach((d, i) => {
        steps.push(`y<sub>${i+1}</sub> = var_inverse(${d.Mi} mod ${d.m}) = ${d.yi}`);
    });
    
    steps.push(`Applying Formula: x = &Sigma; (a<sub>i</sub> &times; M<sub>i</sub> &times; y<sub>i</sub>)`);
    const terms = stepDetails.map(d => `${d.a} &times; ${d.Mi} &times; ${d.yi}`);
    steps.push(`x = ${terms.join(' + ')}`);
    steps.push(`x = ${stepDetails.map(d => d.product).join(' + ')} = ${totalX}`);
    
    let result = totalX % M;
    if (result < 0n) {
        result += M;
    }
    
    steps.push(`Final step: x ≡ ${totalX} (mod ${M}) ≡ ${result} (mod ${M})`);

    return {
        x: result,
        M: M,
        steps: steps,
        operations: congruences.length * 3 + 1 // Rough estimate of math phases
    };
}

// Naive Brute Force Solver
function solveNaive(congruences) {
    if (congruences.length === 0) return { x: 0, steps: 0 };
    
    // Find equation with largest modulo to optimize jump size
    let maxModIndex = 0;
    for(let i=1; i<congruences.length; i++){
        if(BigInt(congruences[i].m) > BigInt(congruences[maxModIndex].m)){
            maxModIndex = i;
        }
    }
    
    let a_max = BigInt(congruences[maxModIndex].a);
    let m_max = BigInt(congruences[maxModIndex].m);
    
    // Normalize target 'a' values to be positive mapped
    congruences = congruences.map(c => ({
        a: ((BigInt(c.a) % BigInt(c.m)) + BigInt(c.m)) % BigInt(c.m),
        m: BigInt(c.m)
    }));
    a_max = ((a_max % m_max) + m_max) % m_max;
    
    let x = a_max;
    let iterations = 0;
    let found = false;
    
    // Protect against freezing on huge sets
    const MAX_ITER = 500000; 
    
    while(!found && iterations < MAX_ITER) {
        iterations++;
        let matches = true;
        for(let i=0; i<congruences.length; i++) {
            if (i === maxModIndex) continue; // skip the one we step by
            if (x % congruences[i].m !== congruences[i].a) {
                matches = false;
                break;
            }
        }
        
        if (matches) {
            found = true;
            break;
        }
        x += m_max;
    }
    
    return {
        x: found ? x : null,
        iterations
    };
}


// UI Interactions
document.addEventListener('DOMContentLoaded', () => {
    
    // Theme toggling
    const themeToggleBtn = document.getElementById('theme-toggle');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    let isDark = true;

    themeToggleBtn.addEventListener('click', () => {
        isDark = !isDark;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        sunIcon.style.display = isDark ? 'inline-block' : 'none';
        moonIcon.style.display = isDark ? 'none' : 'inline-block';
    });

    // Dynamic Congruence Rows
    const addBtn = document.getElementById('add-congruence-btn');
    const container = document.getElementById('congruences-container');
    
    function updateRemoveButtons() {
        const rows = document.querySelectorAll('.congruence-row');
        const removeBtns = document.querySelectorAll('.remove-row');
        if (rows.length <= 2) {
            removeBtns.forEach(btn => btn.disabled = true);
        } else {
            removeBtns.forEach(btn => btn.disabled = false);
        }
    }

    addBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'congruence-row';
        row.innerHTML = `
            <span class="var-x">x ≡</span>
            <div class="input-group">
                <input type="number" name="a" placeholder="a" required step="1">
            </div>
            <span class="mod-text">(mod</span>
            <div class="input-group">
                <input type="number" name="m" placeholder="m" required min="1" step="1">
            </div>
            <span>)</span>
            <button type="button" class="btn-icon remove-row" title="Remove">&times;</button>
        `;
        container.appendChild(row);
        
        row.querySelector('.remove-row').addEventListener('click', function() {
            row.remove();
            updateRemoveButtons();
        });
        
        updateRemoveButtons();
    });

    // Bind existing remove buttons
    document.querySelectorAll('.remove-row').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.congruence-row').remove();
            updateRemoveButtons();
        });
    });

    // Form Submission
    const form = document.getElementById('crt-form');
    const errorMsg = document.getElementById('input-error');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        errorMsg.style.display = 'none';
        
        // Extract values
        const rows = document.querySelectorAll('.congruence-row');
        const congruences = [];
        let hasError = false;
        
        rows.forEach(row => {
            const aInput = row.querySelector('input[name="a"]').value;
            const mInput = row.querySelector('input[name="m"]').value;
            
            if (aInput === '' || mInput === '') {
                hasError = true;
                return;
            }
            
            congruences.push({
                a: parseInt(aInput, 10),
                m: parseInt(mInput, 10)
            });
        });
        
        if (hasError) {
            showError("Please fill out all fields.");
            return;
        }

        const moduli = congruences.map(c => BigInt(c.m));
        
        // Validate Pairwise Coprime
        if (!checkPairwiseCoprime(moduli)) {
            showError("Moduli (m) must be pairwise coprime (their greatest common divisor must be 1 for every pair).");
            return;
        }
        
        // Solve with performance metrics
        try {
            renderOutput(congruences);
        } catch (err) {
            showError(err.message);
        }
    });

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    }

    // Output Rendering
    function renderOutput(congruences) {
        // CRT Algorithm
        const t0_crt = performance.now();
        const crtResult = solveCRT(congruences);
        const t1_crt = performance.now();
        const crtTime = (t1_crt - t0_crt).toFixed(3);
        
        // Naive Algorithm
        const t0_naive = performance.now();
        const naiveResult = solveNaive(congruences);
        const t1_naive = performance.now();
        const naiveTime = (t1_naive - t0_naive).toFixed(3);
        
        // Show Panels
        document.getElementById('result-card').classList.remove('hidden');
        document.getElementById('details-panel').classList.remove('hidden');
        
        // Populate Result Card
        document.getElementById('final-x').textContent = crtResult.x.toString();
        document.getElementById('final-m').textContent = crtResult.M.toString();
        document.getElementById('smallest-x').textContent = crtResult.x.toString();
        
        // Render Steps
        const stepsContainer = document.getElementById('steps-container');
        stepsContainer.innerHTML = '';
        crtResult.steps.forEach((stepHTML, i) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'step-item';
            stepDiv.innerHTML = `
                <div class="step-header">Phase ${i+1}</div>
                <div class="step-math">${stepHTML}</div>
            `;
            stepsContainer.appendChild(stepDiv);
        });
        
        // Render Compare
        document.getElementById('crt-time').textContent = `${crtTime} ms`;
        document.getElementById('crt-ops').textContent = `~${crtResult.operations} O(1) ops`;
        
        if (naiveResult.x !== null) {
            document.getElementById('naive-time').textContent = `${naiveTime} ms`;
            document.getElementById('naive-ops').textContent = `${naiveResult.iterations.toLocaleString()} checks`;
            if(naiveResult.iterations >= 500000) {
                 document.getElementById('naive-ops').textContent = `> 500,000 (Aborted, took ${naiveTime} ms)`;
                 document.getElementById('naive-time').textContent = `Timeout`;
            }
        } else {
            document.getElementById('naive-time').textContent = `Timeout`;
            document.getElementById('naive-ops').textContent = `> 500k iterations`;
        }
    }

    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update buttons
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Update content
            const targetId = `tab-${e.target.getAttribute('data-target')}`;
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(targetId).classList.add('active');
        });
    });
    
    // Initialization setup
    updateRemoveButtons();
});
