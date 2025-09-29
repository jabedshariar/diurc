// Google Sheets CSV URLs
const MEMBER_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTAfWL7HN5tJ8l0i-vsQNctM5Jv2yJNM7kUvRwWyISUApNBFpDNeIlavto0MljoVw/pub?output=csv";
const CERTIFICATE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSgMTRcOrte06XqsvulaJA8PohkTl3RB5yYXoevm5BQIVU-ubnXz5uLCaRN7p7deHHX9A0xPbFHT359/pub?output=csv";

// Pagination settings
const MEMBERS_PER_PAGE = 9;
let currentPage = 1;
let filteredMembers = [];

// --- Theme Toggling ---
function toggleTheme() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// --- Data Fetching and Parsing ---
async function fetchMemberData() {
    const loadingElement = document.getElementById('loadingState');
    const errorElement = document.getElementById('errorState');
    const membersGrid = document.getElementById('membersGrid');
    const dataInfo = document.getElementById('dataInfo');
    const pagination = document.getElementById('pagination');

  try {
        // Show loading state
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        dataInfo.style.display = 'none';
        pagination.style.display = 'none';
        membersGrid.innerHTML = '';
        
        console.log('Fetching data from:', MEMBER_SHEET_URL);
        
        // Fetch data from Google Sheets CSV with cache busting
        const timestamp = new Date().getTime();
        const response = await fetch(`${MEMBER_SHEET_URL}&t=${timestamp}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log('Raw CSV data:', csvText);
        
        if (!csvText || csvText.trim().length === 0) {
            throw new Error('CSV file is empty');
        }
        
        // Parse CSV data manually (simple approach)
        const members = parseCSVData(csvText);
        console.log('Parsed members:', members);
        
        if (members.length === 0) {
            throw new Error('No valid member data found in CSV');
        }
        
        // Store the member data globally
        window.memberData = members;
        filteredMembers = [...members];
        
        // Generate member cards for first page
        displayPage(1);
        
        // Show data info
        dataInfo.textContent = `Showing ${Math.min(MEMBERS_PER_PAGE, filteredMembers.length)} of ${filteredMembers.length} members`;
        dataInfo.style.display = 'block';
        
        // Setup pagination
        setupPagination();
        pagination.style.display = 'flex';
        
        // Hide loading state
        loadingElement.style.display = 'none';
        
    }  catch (error) {
        console.error('Error fetching member data:', error);
        loadingElement.style.display = 'none';
        errorElement.style.display = 'block';
        errorElement.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Could not load data from Google Sheets.</p>
            <p><small>Error: ${error.message}</small></p>
            <p><small>Falling back to sample data.</small></p>
        `;
        
        // Fallback to sample data
        const fallbackMembers = getFallbackMembers();
        window.memberData = fallbackMembers;
        filteredMembers = [...fallbackMembers];
        displayPage(1);
        setupPagination();
        dataInfo.textContent = `Showing sample data (${fallbackMembers.length} members) - Could not load from Google Sheets`;
        dataInfo.style.display = 'block';
        pagination.style.display = 'flex';
    }
}

// Function to parse CSV data manually
function parseCSVData(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
        return [];
    }
    
    // Try to detect headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('CSV Headers:', headers);
    
    const members = [];
    
    // Process data rows
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = parseCSVLine(line);
        
        if (values.length === 0) continue;
        
        // Map values to fields based on header positions
        const name = findValueByPattern(values, headers, ['name', 'student', 'full']);
        const id = findValueByPattern(values, headers, ['id', 'studentid', 'roll']);
        const department = findValueByPattern(values, headers, ['department', 'dept', 'program']);
        const email = findValueByPattern(values, headers, ['email', 'mail']);
        
        // Only add if we have at least a name
        if (name && name !== 'Name' && name !== 'Student Name') {
            // Normalize department for filtering
            let normalizedDept = (department || 'Unknown').toUpperCase().trim();
            
            // Group non-EEE/CSE/SWE departments as "OTHERS"
            if (normalizedDept !== 'EEE' && normalizedDept !== 'CSE' && normalizedDept !== 'SWE') {
                normalizedDept = 'OTHERS';
            }
            
            members.push({
                id: id || `RC${String(members.length + 1).padStart(4, '0')}`,
                name: name,
                department: normalizedDept,
                email: email || 'N/A',
                originalDepartment: department || 'Unknown'
            });
        }
    }
    
    return members;
}

// Helper function to parse a CSV line considering quoted values
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/"/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last field
    result.push(current.trim().replace(/"/g, ''));
    
    return result;
}

// Helper function to find value by header pattern
function findValueByPattern(values, headers, patterns) {
    for (const pattern of patterns) {
        const index = headers.findIndex(h => 
            h.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (index !== -1 && index < values.length && values[index]) {
            return values[index];
        }
    }
    
    // If no pattern match, try to find any non-empty value
    for (let i = 0; i < Math.min(values.length, headers.length); i++) {
        if (values[i] && values[i].trim() !== '') {
            return values[i];
        }
    }
    
    return null;
}

function getFallbackMembers() {
    return [
        { id: "221-15-5656", name: "John Doe", department: "CSE", email: "john.doe@diu.edu.bd", originalDepartment: "CSE" },
        { id: "221-15-5657", name: "Jane Smith", department: "EEE", email: "jane.smith@diu.edu.bd", originalDepartment: "EEE" },
        { id: "221-15-5658", name: "Robert Johnson", department: "SWE", email: "robert.johnson@diu.edu.bd", originalDepartment: "SWE" },
        { id: "221-15-5659", name: "Emily Davis", department: "OTHERS", email: "emily.davis@diu.edu.bd", originalDepartment: "BBA" },
        { id: "221-15-5660", name: "Michael Wilson", department: "CSE", email: "michael.wilson@diu.edu.bd", originalDepartment: "CSE" },
        { id: "221-15-5661", name: "Sarah Brown", department: "EEE", email: "sarah.brown@diu.edu.bd", originalDepartment: "EEE" },
        { id: "221-15-5662", name: "David Miller", department: "SWE", email: "david.miller@diu.edu.bd", originalDepartment: "SWE" },
        { id: "221-15-5663", name: "Lisa Taylor", department: "OTHERS", email: "lisa.taylor@diu.edu.bd", originalDepartment: "English" },
        { id: "221-15-5664", name: "James Anderson", department: "CSE", email: "james.anderson@diu.edu.bd", originalDepartment: "CSE" },
        { id: "221-15-5665", name: "Jennifer Thomas", department: "EEE", email: "jennifer.thomas@diu.edu.bd", originalDepartment: "EEE" },
        { id: "221-15-5666", name: "Christopher Lee", department: "SWE", email: "christopher.lee@diu.edu.bd", originalDepartment: "SWE" },
        { id: "221-15-5667", name: "Amanda White", department: "OTHERS", email: "amanda.white@diu.edu.bd", originalDepartment: "LLB" }
    ];
}

// Function to generate member cards for a specific page
function displayPage(page) {
    const membersGrid = document.getElementById('membersGrid');
    const dataInfo = document.getElementById('dataInfo');
    
    membersGrid.innerHTML = '';
    
    if (filteredMembers.length === 0) {
        membersGrid.innerHTML = `
            <div class="error" style="grid-column: 1 / -1;">
                <i class="fas fa-robot"></i>
                <p>No members found matching your search criteria.</p>
            </div>
        `;
        return;
    }
    
    // Calculate start and end index for current page
    const startIndex = (page - 1) * MEMBERS_PER_PAGE;
    const endIndex = Math.min(startIndex + MEMBERS_PER_PAGE, filteredMembers.length);
    const pageMembers = filteredMembers.slice(startIndex, endIndex);
    
    // Update data info
    dataInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${filteredMembers.length} members`;
    
    pageMembers.forEach(member => {
        const card = document.createElement('div');
        card.className = 'member-card';
        
        // Color mapping based on the logo palette
        const deptColors = {
            'CSE': '#1E415A', // Deep Indigo
            'EEE': '#00BFFF', // Brighter Blue (secondary contrast)
            'SWE': '#5BC0EB', // Mid Cyan
            'OTHERS': '#DDDDDD' // Light Gray for background
        };
        
        const avatarColor = deptColors[member.department] || deptColors['OTHERS'];
        
        card.innerHTML = `
            <div class="member-avatar" style="background: linear-gradient(135deg, ${avatarColor}, #00D4FF)">
                <i class="fas fa-robot"></i>
            </div>
            <div class="member-info">
                <h3 class="member-name">${member.name}</h3>
                <div class="member-department">${member.originalDepartment}</div>
                <div class="member-email">${member.email}</div>
                <div class="member-id">ID: ${member.id}</div>
            </div>
        `;
        
        membersGrid.appendChild(card);
    });
}

// Function to setup pagination
function setupPagination() {
    const totalPages = Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE);
    const pageNumbers = document.getElementById('pageNumbers');
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    
    // Clear existing page numbers
    pageNumbers.innerHTML = '';
    
    // Generate page number buttons
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust if we're at the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Add first page and ellipsis if needed
    if (startPage > 1) {
        const firstPageButton = document.createElement('button');
        firstPageButton.className = 'page-btn';
        firstPageButton.textContent = '1';
        firstPageButton.addEventListener('click', () => {
            currentPage = 1;
            displayPage(currentPage);
            setupPagination();
        });
        pageNumbers.appendChild(firstPageButton);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '8px 5px';
            pageNumbers.appendChild(ellipsis);
        }
    }
    
    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = 'page-btn';
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => {
            currentPage = i;
            displayPage(currentPage);
            setupPagination();
        });
        pageNumbers.appendChild(pageButton);
    }
    
    // Add last page and ellipsis if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '8px 5px';
            pageNumbers.appendChild(ellipsis);
        }
        
        const lastPageButton = document.createElement('button');
        lastPageButton.className = 'page-btn';
        lastPageButton.textContent = totalPages;
        lastPageButton.addEventListener('click', () => {
            currentPage = totalPages;
            displayPage(currentPage);
            setupPagination();
        });
        pageNumbers.appendChild(lastPageButton);
    }
    
    // Update prev/next buttons
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
    
    // Add event listeners for prev/next buttons
    prevButton.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            displayPage(currentPage);
            setupPagination();
        }
    };
    
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayPage(currentPage);
            setupPagination();
        }
    };
}

function filterMembers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
    
    // Get all members from the data we fetched
    const allMembers = window.memberData || [];
    
    filteredMembers = allMembers.filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(searchTerm) || 
                             member.originalDepartment.toLowerCase().includes(searchTerm) || 
                             member.email.toLowerCase().includes(searchTerm) ||
                             member.id.toLowerCase().includes(searchTerm);
        
        const matchesFilter = activeFilter === 'all' || member.department === activeFilter;
        
        return matchesSearch && matchesFilter;
    });
    
    // Reset to first page after filtering
    currentPage = 1;
    displayPage(currentPage);
    setupPagination();
}

// --- Team Data and Modal Functions ---
const MOCK_TEAM_MEMBERS = [
  { id: '221-33-1531', name: 'Jabed Shariar', dept: 'EEE', role: 'Acting President', email: 'shariar33-1531@diu.edu.bd', img: 'js.jpg' },
  { id: '232-35-179', name: 'Al Hasib Arafat', dept: 'SWE', role: 'Member', email: 'arafat2305341179@diu.edu.bd', img: 'aa.jpg' },
  { id: '242220005101880', name: 'Md. Swadhin Miah', dept: 'CSE', role: 'Member', email: 'miah22205101880@diu.edu.bd', img: 'sm.jpg' },
  { id: '242220005101750', name: 'Md. Rifat Mia', dept: 'CSE', role: 'Member', email: 'mia22205101750@diu.edu.bd', img: 'rm.jpg' },
  { id: '232-15-353', name: 'Md. Masud Rana', dept: 'CSE', role: 'Member', email: 'rana2305101353@diu.edu.bd', img: 'mr.jpg' },
  { id: '232-35-334', name: 'Md. Sameul Hasan', dept: 'SWE', role: 'Member', email: 'hasan2305341334@diu.edu.bd', img: 'sh.jpg' },
  { id: '232-35-565', name: 'Md. Naimur Rahman Nayem', dept: 'SWE', role: 'Member', email: 'nayem2305341565@diu.edu.bd', img: 'nn.jpg' },
  { id: '232-33-101', name: 'H M Rahad Ahammed', dept: 'EEE', role: 'Member', email: 'ahammed2305131101@diu.edu.bd', img: 'ra.jpg' },
  { id: '242-35-298', name: 'Md. Irfan Uddin', dept: 'SWE', role: 'Member', email: 'irfan242-35-298@diu.edu.bd', img: 'iu.jpg' },
  { id: '242-33-200', name: 'Mahadi Alam Shahib', dept: 'EEE', role: 'Member', email: 'shahib242-33-200@diu.edu.bd', img: 'ms.jpg' },
  { id: '242-33-044', name: 'Md. Hasibul Hasan Shanto', dept: 'EEE', role: 'Member', email: 'shanto242-33-044@diu.edu.bd', img: 'hs.jpg' },
  { id: '0242220005341193', name: 'Md Mohiuddin Maruf', dept: 'SWE', role: 'Member', email: 'maruf22205341193@diu.edu.bd', img: 'mm.jpg' },
  { id: '0242410005341067', name: 'Md Ratul Bhuiyan', dept: 'SWE', role: 'Member', email: 'ratul241-35-067@diu.edu.bd', img: 'rb.jpg' },
  { id: '0242410005341013', name: 'Asad Al Adil Sayed', dept: 'SWE', role: 'Member', email: 'adil241-35-013@diu.edu.bd', img: 'as.jpg' },
  { id: '232-35-558', name: 'Roktim Saha', dept: 'SWE', role: 'Member', email: 'saha2305341558@diu.edu.bd', img: 'rs.jpg' }
];

function renderTeamMembers() {
    const presidentCard = document.getElementById('presidentCard');
    const teamList = document.getElementById('teamList');
    
    // Clear existing content
    presidentCard.style.display = 'none';
    teamList.innerHTML = '';
    
    // Find the president
    const president = MOCK_TEAM_MEMBERS.find(member => 
        member.role.toLowerCase().includes('president')
    );
    
    // Render president card if found
    if (president) {
        presidentCard.innerHTML = `
            <img src="${president.img}" onerror="this.onerror=null;this.src='https://placehold.co/120x120/1E415A/00D4FF?text=${president.name.charAt(0)}'" alt="${president.name}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 4px solid var(--accent-color);">
            <h4>${president.name}</h4>
            <p class="role">${president.role}</p>
            <p>ID: ${president.id}</p>
            <p>Dept: ${president.dept}</p>
            <p style="margin-top: 10px;"><a href="mailto:${president.email}" style="color: var(--secondary-color); text-decoration: none; font-size: 0.9rem;">${president.email}</a></p>
        `;
        presidentCard.style.display = 'block';
        presidentCard.onclick = () => openMemberDetail(president);
    }
    
    // Render other team members (excluding president)
    const otherMembers = MOCK_TEAM_MEMBERS.filter(member => 
        !member.role.toLowerCase().includes('president')
    );
    
    otherMembers.forEach(member => {
        const card = document.createElement('div');
        card.className = 'member-card';
        card.onclick = () => openMemberDetail(member);
        card.innerHTML = `
            <img src="${member.img}" onerror="this.onerror=null;this.src='https://placehold.co/90x90/1E415A/00D4FF?text=${member.name.charAt(0)}'" alt="${member.name}">
            <h4>${member.name}</h4>
            <p class="role">${member.role}</p>
            <p>ID: ${member.id}</p>
            <p>Dept: ${member.dept}</p>
            <p style="margin-top: 5px;"><a href="mailto:${member.email}" style="color: var(--secondary-color); text-decoration: none; font-size: 0.8rem;">${member.email}</a></p>
        `;
        teamList.appendChild(card);
    });
}

function openMemberDetail(member) {
    const modal = document.getElementById('memberDetailModal');
    document.getElementById('modalMemberImage').src = member.img;
    document.getElementById('modalMemberName').textContent = member.name;
    document.getElementById('modalMemberID').textContent = member.id;
    document.getElementById('modalMemberRole').textContent = member.role;
    document.getElementById('modalMemberDept').textContent = member.dept;
    document.getElementById('modalMemberContact').textContent = member.email;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; 
}

function closeMemberDetail() {
    const modal = document.getElementById('memberDetailModal');
    modal.classList.remove('active');
    document.body.style.overflow = ''; 
}

// --- Slideshow Functionality ---
function initSlideshow() {
    const slideshowContainer = document.getElementById('slideshow');
    
    // Replace these with your actual images
    const images = [
        'banner.png', 
        'champ.jpg',      
        'https://placehold.co/1200x400/1E415A/FFFFFF?text=DIU+ROBOTICS+CLUB:+INNOVATION+DRIVEN'
    ];
    
    let currentSlideIndex = 0;
    
    function createSlide(imageUrl, content) {
        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.style.backgroundImage = `url('${imageUrl}')`;
        slide.innerHTML = `<p>${content}</p>`;
        slideshowContainer.appendChild(slide);
        return slide;
    }

    const slides = images.map((url, index) => {
        let content = (index === 0) ? " " : (index === 1) ? " " : " ";
        return createSlide(url, content);
    });

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.remove('active');
        });
        if (slides[index]) slides[index].classList.add('active');
    }

    function nextSlide() {
        currentSlideIndex = (currentSlideIndex + 1) % slides.length;
        showSlide(currentSlideIndex);
    }
    
    if (slides.length > 0) {
        showSlide(currentSlideIndex);
        setInterval(nextSlide, 5000); 
    }
}

// --- View Switching Function ---
function showView(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
    });

    // Show the requested view
    const activeView = document.getElementById(viewId);
    if (activeView) {
        activeView.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update active state in navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-view') === viewId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Specific View Loaders
    if (viewId === 'members-view') {
        fetchMemberData();
    } else if (viewId === 'team-view') {
         renderTeamMembers();
    }
}

// --- Certificate Verification ---
function setupCertificateVerification() {
    const verifyBtn = document.getElementById('verifyCertificate');
    const resultDiv = document.getElementById('verificationResult');
    
    verifyBtn.addEventListener('click', async function() {
        const certificateId = document.getElementById('certificateId').value.trim();
        
        if (!certificateId) {
            resultDiv.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Please enter a Certificate ID.</p>
                </div>
            `;
            resultDiv.style.display = 'block';
            return;
        }
        
        // Show loading state
        resultDiv.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner"></i>
                <p>Verifying certificate...</p>
            </div>
        `;
        resultDiv.style.display = 'block';
        
        try {
            // Fetch certificate data from Google Sheets
            const timestamp = new Date().getTime();
            const response = await fetch(`${CERTIFICATE_SHEET_URL}&t=${timestamp}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch certificate data: ${response.status} ${response.statusText}`);
            }
            
            const csvText = await response.text();
            
            if (!csvText || csvText.trim().length === 0) {
                throw new Error('Certificate CSV file is empty');
            }
            
            // Parse certificate CSV data
            const certificates = parseCertificateCSV(csvText);
            console.log('Parsed certificates:', certificates);
            
            // Find the certificate by ID
            const certificate = certificates.find(cert => 
                cert.id && cert.id.toString().toLowerCase() === certificateId.toLowerCase()
            );
            
            if (certificate) {
                resultDiv.innerHTML = `
                    <div style="text-align: center; color: var(--accent-color);">
                        <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: 15px;"></i>
                        <h3>Certificate Verified Successfully!</h3>
                        <p style="font-size: 1.2rem; margin: 20px 0; font-weight: 600; line-height: 1.5;">
                            "${certificate.name}" successfully completed the workshop named "${certificate.workshop}" organized by DIU Robotics Club
                        </p>
                        <p><strong>Certificate ID:</strong> ${certificate.id}</p>
                        ${certificate.date ? `<p><strong>Issue Date:</strong> ${certificate.date}</p>` : ''}
                        <p style="margin-top: 15px; color: var(--text-color);">This certificate has been verified and is authentic.</p>
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `
                    <div class="error">
                        <i class="fas fa-times-circle"></i>
                        <h3>Certificate Not Found</h3>
                        <p>The certificate with ID "${certificateId}" could not be found in our records.</p>
                        <p>Please check the Certificate ID and try again, or contact the DIU Robotics Club for assistance.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error verifying certificate:', error);
            resultDiv.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Verification Error</h3>
                    <p>There was an error verifying the certificate. Please try again later.</p>
                    <p><small>Error: ${error.message}</small></p>
                </div>
            `;
        }
    });
}

// Function to parse certificate CSV data
function parseCertificateCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
        return [];
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('Certificate CSV Headers:', headers);
    
    const certificates = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = parseCSVLine(line);
        
        if (values.length === 0) continue;
        
        // Map values based on header patterns
        const id = findValueByPattern(values, headers, ['id', 'certificate', 'certificateid', 'sl', 'serial']);
        const name = findValueByPattern(values, headers, ['name', 'student', 'studentname', 'participant']);
        const workshop = findValueByPattern(values, headers, ['workshop', 'workshopname', 'course', 'coursename', 'event']);
        const date = findValueByPattern(values, headers, ['date', 'issuedate', 'completiondate', 'workshopdate']);
        
        if (id && name && workshop) {
            certificates.push({
                id: id,
                name: name,
                workshop: workshop,
                date: date || null
            });
        }
    }
    
    return certificates;
}

// --- Join Us Form ---
function setupJoinForm() {
    const submitBtn = document.getElementById('submitApplication');
    const resultDiv = document.getElementById('applicationResult');
    
    submitBtn.addEventListener('click', function() {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const studentId = document.getElementById('studentId').value;
        const department = document.getElementById('department').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        
        if (!firstName || !lastName || !studentId || !department || !email) {
            resultDiv.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Please fill in all required fields.</p>
                </div>
            `;
            resultDiv.style.display = 'block';
            return;
        }
        
        // Simulate form submission
        resultDiv.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner"></i>
                <p>Submitting your application...</p>
            </div>
        `;
        resultDiv.style.display = 'block';
        
        setTimeout(() => {
            resultDiv.innerHTML = `
                <div style="text-align: center; color: var(--accent-color);">
                    <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: 15px;"></i>
                    <h3>Application Submitted Successfully!</h3>
                    <p>Thank you, ${firstName} ${lastName}, for your interest in joining the DIU Robotics Club.</p>
                    <p>We have received your application and will contact you at ${email} within 3-5 business days.</p>
                    <p style="margin-top: 15px;">In the meantime, feel free to explore our projects and events!</p>
                </div>
            `;
            
            // Reset form
            document.getElementById('firstName').value = '';
            document.getElementById('lastName').value = '';
            document.getElementById('studentId').value = '';
            document.getElementById('department').value = '';
            document.getElementById('email').value = '';
            document.getElementById('phone').value = '';
            document.getElementById('interest').value = '';
            document.getElementById('experience').value = '';
        }, 2000);
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Apply saved theme
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('themeToggle');
    
    // Default is Light Mode (no class). Checkbox is UNCHECKED.
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    }

    // 2. Setup event listeners
    themeToggle.addEventListener('change', toggleTheme);

    // Member directory event listeners
    document.getElementById('searchInput').addEventListener('input', filterMembers);
    document.getElementById('searchButton').addEventListener('click', filterMembers);
    
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterMembers();
        });
    });

    // Navigation event listeners
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.getAttribute('data-view');
            showView(viewId);
        });
    });

    // Footer navigation
    document.querySelectorAll('footer a[data-view]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const viewId = this.getAttribute('data-view');
            showView(viewId);
        });
    });

    // Modal close event
    document.getElementById('memberDetailModal').addEventListener('click', function(e) {
        if (e.target.id === 'memberDetailModal') {
            closeMemberDetail();
        }
    });

    // 3. Initialize components
    initSlideshow();
    setupCertificateVerification();
    setupJoinForm();
    
    // 4. Show home view by default
    showView('home-view');
});