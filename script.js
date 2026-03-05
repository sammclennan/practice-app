const PATHS = {
  data: './data/',
  assets: {
    images: './assets/images/',
    audio: {
      eng: './assets/audio/eng/',
      sfx: './assets/audio/sfx/',
    }
  }
}

const DATA_FILENAME = 'vocab.json';

const imageCache = {};
const audioCache = {};

const elements = {
  interfaces: {
    selectVocab: document.querySelector('#select-vocab-interface'),
    quiz: document.querySelector('#quiz-interface'),
  },
  menu: {
    vocabList: document.querySelector('#vocab-list'),
    startQuizBtn: document.querySelector('#start-quiz-btn'),
  },
  quiz: {
    sentenceEng: document.querySelector('#sentence-eng'),
    sentenceJp: document.querySelector('#sentence-jp'),
    audio: document.querySelector('#eng-audio'),
    cardControls: {
      prevCard: document.querySelector('#prev-card'),
      shuffleCards: document.querySelector('#shuffle-cards'),
      nextCard: document.querySelector('#next-card'),
    }
  },
}

let vocabData;
let lookup = {};
let index = {};
let vocabList;
let currentIndex = 0;
let currentQuestion;

// Function declarations
const loadJSON = async (filename, directory) => {
  const normalized_filename = filename.endsWith('.json')
    ? filename
    : `${filename}.json`;
  const path = `${directory}${normalized_filename}`;
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.statusText}`);
  }

  return await response.json();
}

const buildIndexAndLookup = (vocabData, lookup, index) => {
  vocabData.forEach(({ id, level, category, ...rest }) => {
    lookup[id] = rest;
    ((index[level] ??= {})[category] ??= []).push(id);
  });
}

const capitalize = (str) => {
  if (typeof str !== 'string') {
      throw new TypeError('Input must be of String type.');
  }
  if (!str) return '';
  return str[0].toUpperCase() + str.slice(1);
}

const fillVocabSelectMenu = (index) => {
  const htmlArr = [];
  for (const [level, categories] of Object.entries(index)) {
    htmlArr.push(`<li class="level-list">`);
    htmlArr.push(`<label><input class="vocab-checkbox" type="checkbox" data-type="level" data-level="${level}">Level ${level}</label>`);
    htmlArr.push('<ul>');
    for (const [category, vocabList] of Object.entries(categories)) {
      htmlArr.push('<li class="category-sublist">');
      htmlArr.push(`<label><input class="vocab-checkbox" type="checkbox" data-type="category" data-level="${level}" data-category="${category}">${capitalize(category)}</label>`)
      htmlArr.push('<ul>');
      for (const item of vocabList) {
        htmlArr.push(`<li><label><input class="vocab-checkbox" type="checkbox" value="${item}" data-type="item" data-level="${level}" data-category="${category}">${lookup[item].eng}</label></li>`);
      }
      htmlArr.push('</ul>');
    }
    htmlArr.push('</ul>');
  }

  elements.menu.vocabList.innerHTML = htmlArr.join('');
}

const autoStart = () => {
  document.querySelectorAll('.vocab-checkbox').forEach(cb => {
    cb.checked = true;
  });
  elements.menu.startQuizBtn.click();
}

const init = async () => {
  try {
    vocabData = await loadJSON(
      DATA_FILENAME,
      PATHS.data,
    );
  } catch (e) {
    console.error('Error fetching JSON:', e);
    // alert('データの読み込みに失敗しました。');
    return;
  }

  buildIndexAndLookup(vocabData, lookup, index);
  fillVocabSelectMenu(index);

  autoStart();
}

const updateParentCheckbox = (checkbox) => {
  const type = checkbox.dataset.type;
  const level = checkbox.dataset.level;
  const category = checkbox.dataset.category;

  let selector = `.vocab-checkbox[data-type="${type}"][data-level="${level}"]`;
  if (type === 'item') {
    selector += `[data-category="${category}"]`;
  }
  
  const siblings = document.querySelectorAll(selector);

  let checkedCount = 0;
  let indeterminateCount = 0;

  siblings.forEach(cb => {
    checkedCount += cb.checked;
    indeterminateCount += cb.indeterminate;
  });
    
  const parentCheckbox =
    checkbox.closest('li')
      ?.parentElement
      ?.closest('li')
      ?.querySelector('.vocab-checkbox');
        
  if (!parentCheckbox) return;

  parentCheckbox.checked = checkedCount === siblings.length;
  parentCheckbox.indeterminate =
    (checkedCount + indeterminateCount > 0) && checkedCount < siblings.length;

  updateParentCheckbox(parentCheckbox);
}

const shuffleArray = (arr) => {
  const res = [...arr];
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }
  return res;
}

const buildQuizVocabList = () => {
  const res = [];
  const byLevel = {};

  elements.menu.vocabList.querySelectorAll('.vocab-checkbox[data-type="item"]:checked').forEach(checkbox => {
    const id = checkbox.value;
    const level = checkbox.dataset.level;
    (byLevel[level] ??= []).push(id);
  });

  Object.values(byLevel).forEach(arr => {
    // res.push(shuffleArray(arr));
    res.push(arr);
  });

  return res.flat();
}

const getCurrentQuestion = (lookup, vocabList, currentIndex) => {
  const cardID = vocabList[currentIndex];
  return lookup[cardID];
}

const clozeSentence = (text) => {
  const splitText = text.split(' ');
  console.log(splitText);

  const htmlArr = [];

  splitText.forEach(word => {
    htmlArr.push(`<div class="word-eng is-clozed">${word}</div>`);
  });

  return htmlArr.join('');
}

const renderQuestion = ({ eng, jp, audio }) => {
  elements.quiz.sentenceEng.innerHTML = clozeSentence(eng);
  elements.quiz.sentenceJp.textContent = jp;
  // elements.quiz.audio.src = PATHS.assets.audio.eng + audio;
}

const newQuestion = () => {
  currentQuestion = getCurrentQuestion(lookup, vocabList, currentIndex);
  console.log(currentQuestion);
  renderQuestion(currentQuestion);
}

const changeQuestionIndex = (newIndex) => {
  if (newIndex < 0 || newIndex >= vocabList.length) return;

  currentIndex = newIndex;
  newQuestion();
}

// Event listeners
document.addEventListener('DOMContentLoaded', init);

elements.menu.startQuizBtn.addEventListener('click', () => {
  vocabList = buildQuizVocabList();

  if (!vocabList.length) {
    alert('Please select some data!');
    return;
  }

  elements.interfaces.selectVocab.classList.add('hidden');
  elements.interfaces.quiz.classList.remove('hidden');

  newQuestion();
});

elements.quiz.cardControls.nextCard.addEventListener('click', () => {
  changeQuestionIndex(currentIndex + 1);
  // newQuestion();
});

elements.quiz.cardControls.prevCard.addEventListener('click', () => {
  changeQuestionIndex(currentIndex - 1);
  // newQuestion();
});

elements.quiz.cardControls.shuffleCards.addEventListener('click', () => {
  vocabList = shuffleArray(vocabList);
  changeQuestionIndex(0);
  // newQuestion();
});

elements.menu.vocabList.addEventListener('change', (e) => {
  if (e.target.matches('.vocab-checkbox')) {
    const checkbox = e.target;

    const descendents =
      checkbox.closest('li')
        .querySelector('ul')
        ?.querySelectorAll('.vocab-checkbox');

    descendents?.forEach(cb => {
      cb.indeterminate = false;
      cb.checked = checkbox.checked;
    });
    
    updateParentCheckbox(checkbox);
  }
});

elements.quiz.sentenceEng.addEventListener('click', (e) => {
  if (e.target.matches('.word-eng')) {
    const wordDiv = e.target;

    // wordDiv.classList.toggle('is-clozed');
    wordDiv.classList.remove('is-clozed');
    wordDiv.setAttribute('contenteditable', 'true');
  }
});

// async function loadImage(filename, imageDir, imageCache) {
//   if (!filename) return null;

//   const key = `${imageDir}${filename}`;
  
//   if (key in imageCache) {
//       return Promise.resolve(imageCache[key])
//   }

//   return new Promise(resolve => {
//       const img = new Image();
//       img.src = key;

//       img.onload = () => {
//           imageCache[key] = img;
//           resolve(img);
//       };

//       img.onerror = () => {
//           console.error(`Failed to load image: ${filename}`);
//           resolve(null);
//       };
//   });
// }

// async function setImageSource(imageEl, filename, directory) {
//   try {
//     const img = await loadImage(filename, directory, imageCache);

//     if (img) {
//         imageEl.src = img.src;
//     } else {
//         imageEl.removeAttribute('src');
//     }
  
//     imageEl.alt = quiz.currentQuestion?.jp || ''; // TODO
//   } catch(e) {
//     console.error('Failed to load vocab image', e);
//   }
// }

// const loadAudio = async (filename, audioDir, audioCache) => {
//   if (!filename) return null;

//   const key = `${audioDir}${filename}`;

//   if (key in audioCache) {
//     return Promise.resolve(audioCache[key]);
//   }

//   return new Promise(resolve => {
//     const audio = new Audio;
//     audio.src = key;
//     audio.preload = 'auto';

//     audio.onloadeddata = () => {
//       audioCache[key] = audio;
//       resolve(audio);
//     }

//     audio.onerror = () => {
//       console.error('Failed to load audio:', key);
//       resolve(null);
//     }
//   });
// }

// const playAudio = async (filename, directory, { wait = false} = {}) => {
//   const audio = await loadAudio(filename, directory, audioCache);
//   if (!audio) return;

//   audio.pause();
//   audio.currentTime = 0;
//   // audio.load(); // Safari bugfix. Uncomment if necessary

//   if (!wait) {
//     await audio.play().catch();
//     return;
//   }

//   await new Promise((resolve, reject) => {
//     audio.addEventListener('ended', resolve, { once: true });
//     audio.addEventListener('error', reject, { once: true });
//     audio.play().catch(reject);
//   });
// }