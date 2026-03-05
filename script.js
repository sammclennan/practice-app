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
    questionControls: {
      prevQuestion: document.querySelector('#prev-question'),
      shuffleQuestions: document.querySelector('#shuffle-questions'),
      toggleEdit: document.querySelector('#toggle-edit'),
      showAnswer: document.querySelector('#show-answer'),
      nextQuestion: document.querySelector('#next-question'),
    }
  },
}

let vocabData;
let lookup = {};
let index = {};
let vocabList;
let currentIndex = 0;
let currentQuestion;
let isEditable = false;

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
  const questionID = vocabList[currentIndex];
  return lookup[questionID];
}

const createClozeSentence = (text) => {
  elements.quiz.sentenceEng.innerHTML = '';

  const splitText = text.split(' ');

  splitText.forEach(word => {
    const wordDiv = document.createElement('div');
    wordDiv.classList.add('word-eng');
    wordDiv.classList.add('is-clozed');
    wordDiv.textContent = word;

    elements.quiz.sentenceEng.appendChild(wordDiv);
  });
}

const renderQuestion = ({ eng, jp, audio }) => {
  createClozeSentence(eng);
  elements.quiz.sentenceJp.textContent = jp;
  // elements.quiz.audio.src = PATHS.assets.audio.eng + audio;
}

const newQuestion = () => {
  currentQuestion = getCurrentQuestion(lookup, vocabList, currentIndex);
  console.log(currentQuestion);
  renderQuestion(currentQuestion);
  elements.quiz.questionControls.toggleEdit.checked = false;
  elements.quiz.questionControls.toggleEdit.dispatchEvent(new Event('change', { bubbles: true }));}

const changeQuestionIndex = (newIndex) => {
  if (newIndex < 0 || newIndex >= vocabList.length) return;

  currentIndex = newIndex;
  newQuestion();
}

// Event listeners
document.addEventListener('DOMContentLoaded', init);

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

elements.quiz.questionControls.nextQuestion.addEventListener('click', () => {
  changeQuestionIndex(currentIndex + 1);
  // newQuestion();
});

elements.quiz.questionControls.prevQuestion.addEventListener('click', () => {
  changeQuestionIndex(currentIndex - 1);
  // newQuestion();
});

elements.quiz.questionControls.shuffleQuestions.addEventListener('click', () => {
  vocabList = shuffleArray(vocabList);
  changeQuestionIndex(0);
  // newQuestion();
});

elements.quiz.questionControls.toggleEdit.addEventListener('change', (e) => {
  isEditable = e.target.checked;
  if (isEditable) {
    elements.quiz.sentenceEng.textContent = currentQuestion.eng; 
    elements.quiz.sentenceJp.setAttribute('contenteditable', true);
    elements.quiz.sentenceEng.setAttribute('contenteditable', true);
  } else {
    createClozeSentence(currentQuestion.eng);
    elements.quiz.sentenceEng.setAttribute('contenteditable', false);
    elements.quiz.sentenceJp.setAttribute('contenteditable', false);
  }
});

elements.quiz.questionControls.showAnswer.addEventListener('click', () => {
  document.querySelectorAll('.word-eng').forEach(div => {
    div.classList.remove('is-clozed');
  }); 
});

elements.quiz.sentenceEng.addEventListener('click', (e) => {
  if (e.target.matches('.word-eng')) {
    const wordDiv = e.target;

    if (!isEditable) {
      wordDiv.classList.toggle('is-clozed');
    }
  }
});