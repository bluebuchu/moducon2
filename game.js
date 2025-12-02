// 게임 상태 관리
const gameState = {
    currentStage: 0,
    currentColorIndex: 0,
    stageTimes: [],
    stageAccuracies: [],
    startTime: null,
    stageStartTime: null,
    isPlaying: false,
    playerResults: []
};

// 브랜드 로고 및 색상 데이터
const brandData = [
    {
        stage: 1,
        name: "요즘IT",
        logoFile: "assets/logos/1단계 요즘 it.png",
        colors: [
            { name: "보라색", hex: "#8B5CF6", rgb: { r: 139, g: 92, b: 246 } },
            { name: "검은색", hex: "#1F2937", rgb: { r: 31, g: 41, b: 55 } }
        ],
        timeLimit: 90000 // 90초
    },
    {
        stage: 2,
        name: "카카오임팩트",
        logoFile: "assets/logos/2단계 카카오임팩트.png",
        colors: [
            { name: "노란색", hex: "#FFEB00", rgb: { r: 255, g: 235, b: 0 } },
            { name: "회색", hex: "#5A5A5A", rgb: { r: 90, g: 90, b: 90 } }
        ],
        timeLimit: 100000 // 100초
    },
    {
        stage: 3,
        name: "제이펍",
        logoFile: "assets/logos/3단계 제이펍 로고.png",
        colors: [
            { name: "연두색", hex: "#8BC34A", rgb: { r: 139, g: 195, b: 74 } },
            { name: "짙은 회색", hex: "#424242", rgb: { r: 66, g: 66, b: 66 } }
        ],
        timeLimit: 110000 // 110초
    },
    {
        stage: 4,
        name: "다바코단",
        logoFile: "assets/logos/4단계 다바코단.png",
        colors: [
            { name: "회색", hex: "#8B949E", rgb: { r: 139, g: 148, b: 158 } }
        ],
        timeLimit: 120000, // 120초
        isFinal: true
    }
];

// DOM 요소
const screens = {
    start: document.getElementById('startScreen'),
    game: document.getElementById('gameScreen'),
    countdown: document.getElementById('countdownScreen'),
    result: document.getElementById('resultScreen'),
    leaderboard: document.getElementById('leaderboardScreen')
};

const gameElements = {
    currentStage: document.getElementById('currentStage'),
    stageBrand: document.getElementById('stageBrand'),
    gameTimer: document.getElementById('gameTimer'),
    logoImage: document.getElementById('logoImage'),
    logoDescription: document.getElementById('logoDescription'),
    targetColorsList: document.getElementById('targetColorsList'),
    currentColorTitle: document.getElementById('currentColorTitle'),
    colorOptions: document.querySelector('.color-options'),
    skipColorBtn: document.getElementById('skipColorBtn')
};

// 유틸리티 함수들
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

function generateSimilarColors(targetColor, count = 3) {
    const target = hexToRgb(targetColor.hex);
    const targetHsl = rgbToHsl(target.r, target.g, target.b);
    const similarColors = [];
    
    // 난이도에 따른 기본 변화량
    const difficultyLevel = gameState.currentStage + 1;
    let hueVariation = Math.max(15, 60 - (difficultyLevel * 10));
    let satVariation = Math.max(10, 40 - (difficultyLevel * 7));
    let lightVariation = Math.max(8, 30 - (difficultyLevel * 5));
    
    // 1, 2단계 난이도 완화
    if (difficultyLevel === 1) {
        hueVariation *= 1.3;
        satVariation *= 1.3;
        lightVariation *= 1.3;
    } else if (difficultyLevel === 2) {
        hueVariation *= 1.2;
        satVariation *= 1.2;
        lightVariation *= 1.2;
    }
    
    // 어두운 색상 특별 처리 (밝기 30% 이하)
    if (targetHsl.l <= 30) {
        lightVariation *= 2.0;
        // 어두운 색상에는 약간의 색조 변화도 추가
        if (targetHsl.s < 20) {
            satVariation = Math.max(satVariation, 25);
        }
    }
    
    // 무채색 특별 처리 (채도 10% 이하)
    if (targetHsl.s <= 10) {
        lightVariation *= 1.5;
        // 무채색에 약간의 색조 추가
        hueVariation = Math.max(hueVariation, 30);
        satVariation = Math.max(satVariation, 20);
    }
    
    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let similarColor;
        
        do {
            const hueShift = (Math.random() - 0.5) * hueVariation;
            const satShift = (Math.random() - 0.5) * satVariation;
            const lightShift = (Math.random() - 0.5) * lightVariation;
            
            const newHue = (targetHsl.h + hueShift + 360) % 360;
            const newSat = Math.max(0, Math.min(100, targetHsl.s + satShift));
            let newLight = Math.max(20, Math.min(90, targetHsl.l + lightShift)); // 최소 밝기 20% 보장
            
            // 원본이 매우 어두운 경우 유사색도 너무 밝지 않게 제한
            if (targetHsl.l <= 20) {
                newLight = Math.min(newLight, targetHsl.l + 30);
            }
            
            const newRgb = hslToRgb(newHue, newSat, newLight);
            similarColor = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
            
            attempts++;
        } while (similarColors.includes(similarColor) && attempts < 20);
        
        if (!similarColors.includes(similarColor)) {
            similarColors.push(similarColor);
        }
    }
    
    return similarColors;
}

function calculateColorSimilarity(color1, color2) {
    const rDiff = color1.r - color2.r;
    const gDiff = color1.g - color2.g;
    const bDiff = color1.b - color2.b;
    const distance = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
    const maxDistance = Math.sqrt(255 * 255 * 3);
    const similarity = (1 - distance / maxDistance) * 100;
    return Math.max(0, Math.min(100, similarity));
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}


// 게임 로직
function startGame() {
    gameState.currentStage = 0;
    gameState.currentColorIndex = 0;
    gameState.stageTimes = [];
    gameState.stageAccuracies = [];
    gameState.startTime = Date.now();
    gameState.isPlaying = true;
    gameState.playerResults = [];
    
    startStage();
}

function startStage() {
    const currentBrand = brandData[gameState.currentStage];
    gameState.currentColorIndex = 0;
    gameState.stageStartTime = Date.now();
    
    // UI 업데이트
    gameElements.currentStage.textContent = `Stage ${currentBrand.stage}/4`;
    gameElements.stageBrand.textContent = currentBrand.name;
    gameElements.logoImage.src = currentBrand.logoFile;
    
    if (currentBrand.isFinal) {
        gameElements.logoDescription.textContent = `파이널 라운드! ${currentBrand.name} 로고의 색상을 맞춰보세요`;
    } else {
        gameElements.logoDescription.textContent = `${currentBrand.name} 로고의 색상을 정확히 맞춰보세요`;
    }
    
    // 목표 색상 표시
    displayTargetColors(currentBrand.colors);
    
    // 첫 번째 색상부터 시작
    startColorMatching();
    
    showScreen('game');
    updateTimer();
}

function displayTargetColors(colors) {
    gameElements.targetColorsList.innerHTML = '';
    colors.forEach((color, index) => {
        const colorItem = document.createElement('div');
        colorItem.className = 'target-color-item';
        colorItem.innerHTML = `
            <div class="target-color-box" style="background-color: ${color.hex}"></div>
            <div class="target-color-label">${color.name}</div>
        `;
        gameElements.targetColorsList.appendChild(colorItem);
    });
}

function startColorMatching() {
    const currentBrand = brandData[gameState.currentStage];
    const currentColor = currentBrand.colors[gameState.currentColorIndex];
    
    // 제목 업데이트
    gameElements.currentColorTitle.textContent = `색상 ${gameState.currentColorIndex + 1} 맞추기 (${currentBrand.colors.length}개 중)`;
    
    // 4개 색상 옵션 생성 (정답 1개 + 유사색 3개)
    generateColorOptions(currentColor);
}

function generateColorOptions(targetColor) {
    const similarColors = generateSimilarColors(targetColor, 3);
    const allOptions = [targetColor.hex, ...similarColors];
    const shuffledOptions = shuffleArray(allOptions);
    
    gameElements.colorOptions.innerHTML = '';
    
    shuffledOptions.forEach((colorHex, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'color-option';
        optionDiv.style.backgroundColor = colorHex;
        optionDiv.dataset.color = colorHex;
        optionDiv.dataset.isCorrect = colorHex === targetColor.hex;
        
        optionDiv.addEventListener('click', () => selectColorOption(optionDiv, targetColor));
        
        gameElements.colorOptions.appendChild(optionDiv);
    });
}

function regenerateColorOptions(targetColor) {
    // 기존 옵션들의 X 표시를 제거하고 새로운 옵션 생성
    const wrongOptions = document.querySelectorAll('.color-option.wrong');
    wrongOptions.forEach(option => {
        option.remove();
    });
    
    // 남은 옵션들도 모두 제거하고 새로 생성
    gameElements.colorOptions.innerHTML = '';
    
    // 새로운 유사색상 생성 (이전과 다르게)
    const similarColors = generateSimilarColors(targetColor, 3);
    const allOptions = [targetColor.hex, ...similarColors];
    const shuffledOptions = shuffleArray(allOptions);
    
    shuffledOptions.forEach((colorHex, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'color-option';
        optionDiv.style.backgroundColor = colorHex;
        optionDiv.dataset.color = colorHex;
        optionDiv.dataset.isCorrect = colorHex === targetColor.hex;
        
        optionDiv.addEventListener('click', () => selectColorOption(optionDiv, targetColor));
        
        gameElements.colorOptions.appendChild(optionDiv);
    });
}

function selectColorOption(selectedOption, targetColor) {
    const isCorrect = selectedOption.dataset.isCorrect === 'true';
    const selectedColor = selectedOption.dataset.color;
    
    if (isCorrect) {
        // 정답인 경우
        document.querySelectorAll('.color-option').forEach(option => {
            option.style.pointerEvents = 'none';
            if (option.dataset.isCorrect === 'true') {
                option.classList.add('correct');
                const checkMark = document.createElement('div');
                checkMark.className = 'result-mark';
                checkMark.textContent = '✓';
                option.appendChild(checkMark);
                
                // 파티클 효과 생성
                createParticleExplosion(option, targetColor.hex);
            }
        });
        
        // 성공 기록 저장
        gameState.playerResults.push({
            stage: brandData[gameState.currentStage].stage,
            brand: brandData[gameState.currentStage].name,
            colorName: targetColor.name,
            targetColor: targetColor.hex,
            playerColor: selectedColor,
            accuracy: 100,
            success: true
        });
        
        // 1.5초 후 다음 색상/단계로
        setTimeout(() => {
            gameState.currentColorIndex++;
            
            if (gameState.currentColorIndex < brandData[gameState.currentStage].colors.length) {
                startColorMatching();
            } else {
                finishStage();
            }
        }, 1500);
        
    } else {
        // 틀렸을 경우 - 선택한 옵션에만 X 표시하고 새로운 4개 옵션 생성
        selectedOption.classList.add('wrong');
        selectedOption.style.pointerEvents = 'none';
        
        const xMark = document.createElement('div');
        xMark.className = 'result-mark';
        xMark.textContent = '✗';
        selectedOption.appendChild(xMark);
        
        // 1.5초 후 새로운 4개 옵션 생성
        setTimeout(() => {
            regenerateColorOptions(targetColor);
        }, 1500);
    }
}

// skipColor 함수 제거 - 이제 맞쾌 때까지 계속 도전해야 함

function finishStage() {
    const stageTime = Date.now() - gameState.stageStartTime;
    gameState.stageTimes.push(stageTime);
    
    // 현재 단계의 평균 정확도 계산
    const currentBrand = brandData[gameState.currentStage];
    const stageResults = gameState.playerResults.filter(result => result.stage === currentBrand.stage);
    const avgAccuracy = stageResults.reduce((sum, result) => sum + result.accuracy, 0) / stageResults.length;
    gameState.stageAccuracies.push(avgAccuracy);
    
    gameState.currentStage++;
    
    if (gameState.currentStage < brandData.length) {
        // 3초 카운트다운 후 다음 단계
        showCountdown();
    } else {
        // 게임 완료
        finishGame();
    }
}

function showCountdown() {
    const nextBrand = brandData[gameState.currentStage];
    
    document.getElementById('countdownStageTitle').textContent = 
        nextBrand.isFinal ? '파이널 라운드 준비' : `Stage ${nextBrand.stage} 준비`;
    
    showScreen('countdown');
    
    let count = 3;
    const countdownNumber = document.getElementById('countdownNumber');
    countdownNumber.textContent = count;
    countdownNumber.style.animation = 'none';
    setTimeout(() => {
        countdownNumber.style.animation = 'countdownPulse 1s ease';
    }, 10);
    
    const countInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownNumber.textContent = count;
            countdownNumber.style.animation = 'none';
            setTimeout(() => {
                countdownNumber.style.animation = 'countdownPulse 1s ease';
            }, 10);
        } else {
            clearInterval(countInterval);
            startStage();
        }
    }, 1000);
}

function finishGame() {
    gameState.isPlaying = false;
    const totalTime = Date.now() - gameState.startTime;
    
    // 결과 화면 업데이트
    document.getElementById('totalTime').textContent = formatTime(totalTime);
    
    const totalAccuracy = gameState.stageAccuracies.reduce((sum, acc) => sum + acc, 0) / gameState.stageAccuracies.length;
    document.getElementById('averageAccuracy').textContent = `${totalAccuracy.toFixed(1)}%`;
    
    const successfulColors = gameState.playerResults.filter(result => result.success).length;
    const totalColors = gameState.playerResults.length;
    document.getElementById('successfulColors').textContent = `${successfulColors}/${totalColors}`;
    
    // 모든 색상을 맞춰야 리더보드에 등록 가능
    const nameInputSection = document.getElementById('nameInputSection');
    
    if (successfulColors === totalColors) {
        nameInputSection.style.display = 'block';
        // 완주 메시지 표시
        document.getElementById('resultTitle').textContent = '축하합니다! 완주하셨습니다!';
        document.getElementById('resultTitle').style.color = '#4caf50';
    } else {
        nameInputSection.style.display = 'none';
        // 미완주 메시지 표시
        document.getElementById('resultTitle').textContent = '아직 완주하지 못하셨습니다';
        document.getElementById('resultTitle').style.color = '#f44336';
    }
    
    // 단계별 결과 표시
    displayStageResults();
    
    showScreen('result');
}

function displayStageResults() {
    const stageResultsList = document.getElementById('stageResultsList');
    stageResultsList.innerHTML = '';
    
    brandData.forEach((brand, index) => {
        const stageResults = gameState.playerResults.filter(result => result.stage === brand.stage);
        const avgAccuracy = stageResults.reduce((sum, result) => sum + result.accuracy, 0) / stageResults.length;
        
        const resultItem = document.createElement('div');
        resultItem.className = 'stage-result-item';
        
        const accuracyClass = avgAccuracy >= 100 ? '' : 'low';
        
        resultItem.innerHTML = `
            <span class="stage-name">${brand.name}</span>
            <span class="stage-accuracy ${accuracyClass}">${avgAccuracy.toFixed(1)}%</span>
        `;
        
        stageResultsList.appendChild(resultItem);
    });
}

function updateTimer() {
    if (!gameState.isPlaying) return;
    
    const elapsed = Date.now() - gameState.startTime;
    gameElements.gameTimer.textContent = formatTime(elapsed);
    
    requestAnimationFrame(updateTimer);
}

// 점수 저장 및 리더보드
function saveScore() {
    const playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
        alert('닉네임을 입력해주세요!');
        return;
    }
    
    const totalTime = Date.now() - gameState.startTime;
    const totalAccuracy = gameState.stageAccuracies.reduce((sum, acc) => sum + acc, 0) / gameState.stageAccuracies.length;
    const successfulColors = gameState.playerResults.filter(result => result.success).length;
    
    const scoreData = {
        name: playerName,
        totalTime: totalTime,
        totalTimeFormatted: formatTime(totalTime),
        averageAccuracy: totalAccuracy,
        successfulColors: successfulColors,
        totalColors: gameState.playerResults.length,
        date: new Date().toISOString(),
        results: gameState.playerResults
    };
    
    // 로컬 스토리지에 저장
    const scores = JSON.parse(localStorage.getItem('moduconGameV2Scores') || '[]');
    scores.push(scoreData);
    scores.sort((a, b) => {
        // 모든 색상을 맞춘 사람들만 시간 기준으로 정렬
        // 모두 맞춰야 리더보드에 등록 가능
        const aCompleted = a.successfulColors === a.totalColors;
        const bCompleted = b.successfulColors === b.totalColors;
        
        if (aCompleted && bCompleted) {
            // 둘 다 완료한 경우 시간 순
            return a.totalTime - b.totalTime;
        } else if (aCompleted && !bCompleted) {
            // a만 완료한 경우
            return -1;
        } else if (!aCompleted && bCompleted) {
            // b만 완료한 경우
            return 1;
        } else {
            // 둘 다 미완료인 경우 정확도 순
            return b.averageAccuracy - a.averageAccuracy;
        }
    });
    localStorage.setItem('moduconGameV2Scores', JSON.stringify(scores.slice(0, 50)));
    
    alert('기록이 저장되었습니다!');
    document.getElementById('nameInputSection').style.display = 'none';
    loadLeaderboard();
}

function loadLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '<div class="loading">로딩 중...</div>';
    
    try {
        const scores = JSON.parse(localStorage.getItem('moduconGameV2Scores') || '[]');
        
        if (scores.length === 0) {
            leaderboardList.innerHTML = '<div class="loading">아직 기록이 없습니다.</div>';
            return;
        }
        
        leaderboardList.innerHTML = '';
        scores.slice(0, 10).forEach((score, index) => {
            const item = document.createElement('div');
            item.className = `leaderboard-item`;
            if (index < 3) item.classList.add(`rank-${index + 1}`);
            
            item.innerHTML = `
                <span class="rank">${index + 1}</span>
                <span class="player-name">${score.name}</span>
                <span class="player-time">${score.totalTimeFormatted}</span>
                <span class="player-accuracy">${score.averageAccuracy.toFixed(1)}%</span>
            `;
            
            leaderboardList.appendChild(item);
        });
    } catch (error) {
        console.error('Leaderboard load error:', error);
        leaderboardList.innerHTML = '<div class="loading">리더보드를 불러올 수 없습니다.</div>';
    }
}

// 인터랙티브 색상 커서
const colorCursor = document.getElementById('colorCursor');
let isOnStartScreen = true;

function updateColorCursor(e) {
    if (!isOnStartScreen) return;
    
    colorCursor.style.left = e.clientX + 'px';
    colorCursor.style.top = e.clientY + 'px';
    
    // 마우스 위치에 따라 투명도와 크기만 변경 (다크 그레이 톤 유지)
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    const opacity = 0.2 + (x * 0.3); // 20% ~ 50% 투명도
    const scale = 0.8 + (y * 0.4); // 0.8 ~ 1.2 배 크기
    
    colorCursor.style.background = `radial-gradient(circle, 
        rgba(44, 62, 80, ${opacity}), 
        rgba(44, 62, 80, ${opacity * 0.3}))`;
    colorCursor.style.borderColor = `rgba(44, 62, 80, ${opacity * 0.8})`;
    colorCursor.style.boxShadow = `
        0 0 ${15 + x * 10}px rgba(44, 62, 80, ${opacity * 0.6}),
        0 0 ${30 + y * 20}px rgba(44, 62, 80, ${opacity * 0.3})`;
}

function showColorCursor() {
    if (screens.start.classList.contains('active')) {
        colorCursor.classList.add('active');
        isOnStartScreen = true;
    }
}

function hideColorCursor() {
    colorCursor.classList.remove('active');
    isOnStartScreen = false;
}

// 화면 전환 시 커서 상태 업데이트
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
    
    if (screenName === 'start') {
        showColorCursor();
    } else {
        hideColorCursor();
    }
}

// 파티클 효과 함수
function createParticleExplosion(element, color) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // 12개의 파티클 생성
    for (let i = 0; i < 12; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.backgroundColor = 'rgba(44, 62, 80, 0.6)'; // 다크 그레이 파티클
        particle.style.boxShadow = '0 0 6px rgba(44, 62, 80, 0.4)'; // 은은한 글로우
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        
        // 랜덤한 방향과 거리
        const angle = (i * 30) + Math.random() * 30;
        const distance = 50 + Math.random() * 100;
        const duration = 0.6 + Math.random() * 0.4;
        
        const radian = angle * Math.PI / 180;
        const endX = centerX + Math.cos(radian) * distance;
        const endY = centerY + Math.sin(radian) * distance;
        
        particle.style.animation = `particleExplode ${duration}s ease-out forwards`;
        particle.style.transform = `translate(${endX - centerX}px, ${endY - centerY}px)`;
        
        document.body.appendChild(particle);
        
        // 애니메이션 완료 후 파티클 제거
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, duration * 1000);
    }
}

// 마우스 이벤트 리스너
document.addEventListener('mousemove', updateColorCursor);
document.addEventListener('mouseenter', () => {
    if (screens.start.classList.contains('active')) {
        showColorCursor();
    }
});
document.addEventListener('mouseleave', hideColorCursor);

// 이벤트 리스너
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('leaderboardBtn').addEventListener('click', () => {
    loadLeaderboard();
    showScreen('leaderboard');
});
document.getElementById('retryBtn').addEventListener('click', startGame);
document.getElementById('homeBtn').addEventListener('click', () => showScreen('start'));
document.getElementById('backBtn').addEventListener('click', () => showScreen('start'));
document.getElementById('saveScoreBtn').addEventListener('click', saveScore);
// skipColorBtn 제거로 인한 이벤트 리스너 제거

// Enter 키로 점수 저장
document.getElementById('playerName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        saveScore();
    }
});