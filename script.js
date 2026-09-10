// ==========================================
// EDULEVEL — единый файл
// ==========================================

// ---------- ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ----------

let currentUser = null;
let userKey = "guest";

const maxXp = 1000;
const subjectMaxXp = 100;

const defaultXp = 0;
const defaultLevel = 0;

const defaultSubjects = {
    "МАТЕМАТИКА":           { xp: 0, level: 0 },
    "РУССКИЙ ЯЗЫК":         { xp: 0, level: 0 },
    "АНГЛИЙСКИЙ ЯЗЫК":      { xp: 0, level: 0 },
    "ИСТОРИЯ":              { xp: 0, level: 0 },
    "БЕЛАРУСКАЯ МОВА":      { xp: 0, level: 0 },
    "БЕЛАРУСКАЯ ЛІТАРАТУРА":{ xp: 0, level: 0 }
};

function cloneDefaultSubjects() {
    const result = {};
    Object.keys(defaultSubjects).forEach(function (subject) {
        result[subject] = { totalXp: 0, xp: 0, level: 0 };
    });
    return result;
}

let xp = defaultXp;
let level = defaultLevel;
let totalXp = defaultXp;
let subjects = cloneDefaultSubjects();

// ---------- ЗАГРУЗКА / СОХРАНЕНИЕ ----------

function loadUserData() {
    const saved = localStorage.getItem("eduLevelData_v2_" + userKey);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            // Новый формат: уровень всегда вычисляется из накопленного XP.
            // Старые сохранения автоматически мигрируются.
            if (data.totalXp !== undefined) {
                totalXp = Math.max(0, Number(data.totalXp) || 0);
            } else {
                const oldXp = Math.max(0, Number(data.xp) || 0);
                const oldLevel = Math.max(0, Number(data.level) || 0);
                totalXp = oldLevel * maxXp + oldXp;
            }

            xp = totalXp % maxXp;
            level = Math.floor(totalXp / maxXp);

            subjects = data.subjects
                ? Object.assign({}, cloneDefaultSubjects(), data.subjects)
                : cloneDefaultSubjects();

            Object.keys(defaultSubjects).forEach(function (subject) {
                const savedSubject = subjects[subject] || {};
                const subjectTotalXp = savedSubject.totalXp !== undefined
                    ? Math.max(0, Number(savedSubject.totalXp) || 0)
                    : Math.max(0, Number(savedSubject.level) || 0) * subjectMaxXp
                      + Math.max(0, Number(savedSubject.xp) || 0);

                subjects[subject] = {
                    totalXp: subjectTotalXp,
                    xp: subjectTotalXp % subjectMaxXp,
                    level: Math.floor(subjectTotalXp / subjectMaxXp)
                };
            });
            completedTasks = new Set(Array.isArray(data.completedTasks) ? data.completedTasks : []);
        } catch (e) {
            xp = defaultXp;
            level = defaultLevel;
            totalXp = defaultXp;
            subjects = cloneDefaultSubjects();
            completedTasks = new Set();
        }
    } else {
        xp = defaultXp;
        level = defaultLevel;
        totalXp = defaultXp;
        subjects = cloneDefaultSubjects();
        completedTasks = new Set();
    }
    updateProgress();
    updateSubjects();
}

function saveUserData() {
    localStorage.setItem(
        "eduLevelData_v2_" + userKey,
        JSON.stringify({
            totalXp: totalXp,
            subjects: subjects,
            completedTasks: Array.from(completedTasks)
        })
    );
}

// ---------- ЭЛЕМЕНТЫ ----------

const classSelect      = document.querySelector("#classSelect");
const subjectSelect    = document.querySelector("#subjectSelect");
const topicSelect      = document.querySelector("#topicSelect");
const selectedSubject  = document.querySelector("#selectedSubject");
const selectedTopic    = document.querySelector("#selectedTopic");
const startTaskButton  = document.querySelector("#startTask");
const taskArea         = document.querySelector("#taskArea");
const taskDescription  = document.querySelector("#taskDescription");
const answerInput      = document.querySelector("#answerInput");
const checkAnswerButton= document.querySelector("#checkAnswer");
const answerResult     = document.querySelector("#answerResult");

let currentTask = null;
let completedTasks = new Set();

// ---------- КЛАСС ----------

const subjectsByClass = {
    "5": [
        "МАТЕМАТИКА",
        "РУССКИЙ ЯЗЫК",
        "АНГЛИЙСКИЙ ЯЗЫК",
        "ИСТОРИЯ",
        "БЕЛАРУСКАЯ МОВА",
        "БЕЛАРУСКАЯ ЛІТАРАТУРА"
    ],
    "6": [],
    "7": [],
    "8": [],
    "9": [],
    "10": [],
    "11": []
};

const subjectLabels = {
    "МАТЕМАТИКА": "Математика",
    "РУССКИЙ ЯЗЫК": "Русский язык",
    "АНГЛИЙСКИЙ ЯЗЫК": "Английский язык",
    "ИСТОРИЯ": "История",
    "БЕЛАРУСКАЯ МОВА": "Беларуская мова",
    "БЕЛАРУСКАЯ ЛІТАРАТУРА": "Беларуская літаратура"
};

const savedClass = localStorage.getItem("studentClass");
if (savedClass && classSelect.querySelector('option[value="' + savedClass + '"]')) {
    classSelect.value = savedClass;
}

function getSubjectsForClass(studentClass) {
    return subjectsByClass[studentClass] || [];
}

function updateSubjectOptions() {
    const studentClass = classSelect.value;
    const availableSubjects = getSubjectsForClass(studentClass);
    const oldSubject = subjectSelect.value;

    subjectSelect.innerHTML = "";

    if (availableSubjects.length === 0) {
        const option = document.createElement("option");
        option.textContent = "Предметы для этого класса пока не добавлены";
        option.value = "";
        option.disabled = true;
        option.selected = true;
        subjectSelect.appendChild(option);
        subjectSelect.disabled = true;
        topicSelect.innerHTML = "";
        topicSelect.disabled = true;
        startTaskButton.disabled = true;
        selectedSubject.textContent = "—";
        selectedTopic.textContent = "—";
        taskDescription.textContent = "Для выбранного класса предметы пока не добавлены.";
        taskArea.style.display = "none";
        return;
    }

    subjectSelect.disabled = false;
    topicSelect.disabled = false;
    startTaskButton.disabled = false;

    availableSubjects.forEach(function (subject) {
        const option = document.createElement("option");
        option.value = subject;
        option.textContent = subjectLabels[subject] || subject;
        subjectSelect.appendChild(option);
    });

    if (availableSubjects.includes(oldSubject)) {
        subjectSelect.value = oldSubject;
    } else {
        subjectSelect.value = availableSubjects[0];
    }

    updateTopics();
}

classSelect.addEventListener("change", function () {
    localStorage.setItem("studentClass", classSelect.value);
    updateSubjectOptions();
    updateSubjectCards();
});

// ---------- ТЕМЫ ----------

const topicsByClass = {
    "5": [
        "Повторение",
        "Натуральные числа",
        "Сравнение чисел",
        "Измерение отрезков",
        "Округление",
        "Сложение и вычитание",
        "Умножение и деление",
        "Степень",
        "Деление с остатком",
        "Делители и кратные",
        "Признаки делимости",
        "Простые числа",
        "Уравнения",
        "Формулы",
        "Задачи с уравнениями",
        "Углы",
        "Обыкновенные дроби",
        "Деление и дроби. Основное свойство дроби",
        "Правильные и неправильные дроби. Смешанные числа",
        "Сравнение дробных чисел",
        "Сложение и вычитание обыкновенных дробей",
        "Сложение и вычитание смешанных чисел",
        "Умножение дробных чисел",
        "Деление дробных чисел",
        "Задачи на все действия с дробными числами",
        "Задачи на применение дробей",
        "Параллельные и перпендикулярные прямые",
        "Ломаная. Многоугольник. Периметр многоугольника",
        "Площадь. Единицы измерения площади",
        "Площадь прямоугольного треугольника и некоторых видов многоугольников",
        "Среднее арифметическое нескольких чисел",
        "Линейные и столбчатые диаграммы",
        "Прямоугольный параллелепипед. Куб",
        "Объём. Единицы измерения объёма. Объём прямоугольного параллелепипеда"
    ]
};

const topics = {
    "РУССКИЙ ЯЗЫК": [
        "Текст",
        "Словосочетание. Предложение",
        "Состав слова. Орфограмма",
        "Правописание",
        "Части речи",
        "Язык и речь",
        "Культура устной и письменной речи. Нормы литературного языка",
        "Орфоэпическая, орфографическая, словообразовательная нормы",
        "Морфологическая, синтаксическая, пунктуационная нормы",
        "Качества речи. Точность и логичность речи",
        "Богатство, выразительность, чистота и уместность речи",
        "Диалог. Монолог",
        "Признаки речевой ситуации",
        "Разговорный, научный и художественный стили речи",
        "Официально-деловой, публицистический стили речи",
        "Лексическая норма",
        "Словосочетание",
        "Предложение. Виды предложений по цели высказывания и по интонации",
        "Главные члены предложения",
        "Второстепенные члены предложения",
        "Однородные члены предложения",
        "Обращение",
        "Сложное предложение",
        "Предложения с прямой речью",
        "Понятие о тексте. Основные признаки текста",
        "Виды и средства связи предложений в тексте",
        "Типы текста: повествование, описание, рассуждение"
    ],
    "АНГЛИЙСКИЙ ЯЗЫК": [
        "Unit 1. In summer — Lesson 1. Back to school",
        "Unit 1. In summer — Lesson 2. Holiday photographs",
        "Unit 1. In summer — Lesson 3. At the seaside",
        "Unit 1. In summer — Lesson 4. In the mountains",
        "Unit 1. In summer — Lesson 5. Summer stories",
        "Unit 1. In summer — Lesson 6. I know what you did last summer",
        "Unit 1. In summer — Lesson 7. Summer fun",
        "Unit 1. In summer — Lesson 8. What happened?",
        "Unit 1. In summer — Lesson 9. Get a medal!",
        "Unit 1. In summer — Lesson 10. Favourite summer moments",
        "Unit 1. In summer — Lesson 11. Picture stories",
        "Unit 1. In summer — Lesson 12. Reading for pleasure: Humpty Dumpty",
        "Unit 2. Be active! — Lesson 1. Favourite day",
        "Unit 2. Be active! — Lesson 2. Likes and dislikes",
        "Unit 2. Be active! — Lesson 3. Bright autumn festival",
        "Unit 2. Be active! — Lesson 4. Be happy!",
        "Unit 2. Be active! — Lesson 5. In the park",
        "Unit 2. Be active! — Lesson 6. Out for a walk",
        "Unit 2. Be active! — Lesson 7. Fun weekend",
        "Unit 2. Be active! — Lesson 8. Weekend recount",
        "Unit 2. Be active! — Lesson 9. Get a medal!",
        "Unit 2. Be active! — Lesson 10. Weekend planner",
        "Unit 2. Be active! — Lesson 11. What a day!",
        "Unit 2. Be active! — Lesson 12. Reading for pleasure: Teddy and Lucky",
        "Unit 3. What’s on TV? — Lesson 1. Do you like TV?",
        "Unit 3. What’s on TV? — Lesson 2. Films for you and me",
        "Unit 3. What’s on TV? — Lesson 3. What time is it?",
        "Unit 3. What’s on TV? — Lesson 4. How often do you watch TV?",
        "Unit 3. What’s on TV? — Lesson 5. Recommend a TV show!",
        "Unit 3. What’s on TV? — Lesson 6. The history of cartoons",
        "Unit 3. What’s on TV? — Lesson 7. Winnie-the-Pooh and all, all, all",
        "Unit 3. What’s on TV? — Lesson 8. My favourite cartoon character",
        "Unit 3. What’s on TV? — Lesson 9. The quiz",
        "Unit 3. What’s on TV? — Lesson 10. Meeting Robin Hood",
        "Unit 3. What’s on TV? — Lesson 11. Get a medal!",
        "Unit 3. What’s on TV? — Lesson 12. Reading for pleasure: Robin Hood and the Golden Arrow",
        "Unit 4. Festivals and celebrations — Lesson 1. A British calendar",
        "Unit 4. Festivals and celebrations — Lesson 2. Let’s celebrate!",
        "Unit 4. Festivals and celebrations — Lesson 3. Mother’s Day and Father’s Day",
        "Unit 4. Festivals and celebrations — Lesson 4. Special days of the planet",
        "Unit 4. Festivals and celebrations — Lesson 5. Before Christmas",
        "Unit 4. Festivals and celebrations — Lesson 6. Belarusian special days scrapbook",
        "Unit 4. Festivals and celebrations — Lesson 7. Quiz time!",
        "Unit 4. Festivals and celebrations — Lesson 8. Christmas fun",
        "Unit 4. Festivals and celebrations — Lesson 9. Pancake Day",
        "Unit 4. Festivals and celebrations — Lesson 10. Get a medal!",
        "Unit 4. Festivals and celebrations — Lesson 11. Let’s have a party!",
        "Unit 4. Festivals and celebrations — Lesson 12. Reading for pleasure: The Nutcracker",
        "Unit 5. Be healthy! — Lesson 1. Eat-well plate",
        "Unit 5. Be healthy! — Lesson 2. An apple a day keeps the doctor away",
        "Unit 5. Be healthy! — Lesson 3. Zucchini cake",
        "Unit 5. Be healthy! — Lesson 4. Healthy food vs junk food",
        "Unit 5. Be healthy! — Lesson 5. My health diary",
        "Unit 5. Be healthy! — Lesson 6. Body rap",
        "Unit 5. Be healthy! — Lesson 7. At the doctor’s",
        "Unit 5. Be healthy! — Lesson 8. Bless you!",
        "Unit 5. Be healthy! — Lesson 9. Health experts",
        "Unit 5. Be healthy! — Lesson 10. Porridge time!",
        "Unit 5. Be healthy! — Lesson 11. Climb the health stairs",
        "Unit 6. In the city — Lesson 1. Cities and towns",
        "Unit 6. In the city — Lesson 2. In my neighbourhood",
        "Unit 6. In the city — Lesson 3. Can you tell me the way?",
        "Unit 6. In the city — Lesson 4. Travelling around the city",
        "Unit 6. In the city — Lesson 5. Travelling around Minsk",
        "Unit 6. In the city — Lesson 6. Traffic rules",
        "Unit 6. In the city — Lesson 7. Old towns of Belarus",
        "Unit 6. In the city — Lesson 8. My favourite place",
        "Unit 6. In the city — Lesson 9. Treasure hunt game",
        "Unit 6. In the city — Lesson 10. Baker’s Street adventures",
        "Unit 6. In the city — Lesson 11. On top of the skyscraper",
        "Unit 7. In the country — Lesson 1. Enjoy the countryside!",
        "Unit 7. In the country — Lesson 2. Visit England!",
        "Unit 7. In the country — Lesson 3. Stay safe in the countryside",
        "Unit 7. In the country — Lesson 4. Let’s go hiking!",
        "Unit 7. In the country — Lesson 5. On the farm",
        "Unit 7. In the country — Lesson 6. Welcome to a world of animal magic!",
        "Unit 7. In the country — Lesson 7. Wildlife of Belarus",
        "Unit 7. In the country — Lesson 8. Belovezhskaya Pushcha",
        "Unit 7. In the country — Lesson 9. A trip to the country",
        "Unit 7. In the country — Lesson 10. Mysterious Stonehenge",
        "Unit 7. In the country — Lesson 11. Animals’ board game",
        "Unit 8. Countries and continents — Lesson 1. Look at the world map",
        "Unit 8. Countries and continents — Lesson 2. Hot and cold, dry and wet",
        "Unit 8. Countries and continents — Lesson 3. Running fast and walking slowly",
        "Unit 8. Countries and continents — Lesson 4. Rules all over the world",
        "Unit 8. Countries and continents — Lesson 5. East or west — home is best",
        "Unit 8. Countries and continents — Lesson 6. The world celebrates",
        "Unit 8. Countries and continents — Lesson 7. It’s a small world",
        "Unit 8. Countries and continents — Lesson 8. Geography chant",
        "Unit 8. Countries and continents — Lesson 9. My place in the world",
        "Unit 8. Countries and continents — Lesson 10. Alphabet quest for countries and continents",
        "Unit 8. Countries and continents — Lesson 11. Why do birds fly south?",
        "Unit 9. Travelling — Lesson 1. Travel far and wide",
        "Unit 9. Travelling — Lesson 2. What is your favourite way of travelling?",
        "Unit 9. Travelling — Lesson 3. A fortune-teller",
        "Unit 9. Travelling — Lesson 4. Let’s choose the route for our journey!",
        "Unit 9. Travelling — Lesson 5. Invite your friend to Belarus",
        "Unit 9. Travelling — Lesson 6. Safety tips and rules",
        "Unit 9. Travelling — Lesson 7. A traveller’s diary",
        "Unit 9. Travelling — Lesson 8. Interview about an adventurous journey",
        "Unit 9. Travelling — Lesson 9. It can’t be true!",
        "Unit 9. Travelling — Lesson 10. My dream journey in photos",
        "Unit 9. Travelling — Lesson 11. Following in Charles Darwin’s footsteps",    ],
    "ФИЗИКА":          ["Механика", "Сила и движение", "Энергия"],
    "ХИМИЯ":           ["Вещества", "Атомы и молекулы", "Химические реакции"],
    "БИОЛОГИЯ":        ["Клетка", "Растения", "Животные"],
    "ИСТОРИЯ": [
        "Часть 1 — § 1. Мир древней истории",
        "Часть 1 — § 2. Счет лет в истории",
        "Часть 1 — § 3. Древнейшие люди",
        "Часть 1 — § 4. Первые шаги человека современного вида",
        "Часть 1 — § 5. Возникновение искусства и религии",
        "Часть 1 — § 6. Появление земледелия и животноводства",
        "Часть 1 — § 7. Переход от родовой общины к соседской",
        "Часть 1 — § 8. На пути к цивилизации",
        "Часть 1 — § 9. Природа и население Древнего Египта",
        "Часть 1 — § 10. Государство фараонов",
        "Часть 1 — § 11. Превращение Древнего Египта в могущественную державу",
        "Часть 1 — § 12. Быт и повседневная жизнь древних египтян",
        "Часть 1 — § 13. Религия древних египтян",
        "Часть 1 — § 14. Культура древних египтян",
        "Часть 1 — § 15. Древнее Междуречье",
        "Часть 1 — § 16. Становление государства в Месопотамии",
        "Часть 1 — § 17. Государство Хаммурапи",
        "Часть 1 — § 18. Ассирия и Вавилония",
        "Часть 1 — § 19. Культура и религия народов Междуречья",
        "Часть 1 — § 20. Хеттская держава",
        "Часть 1 — § 21. Древний Иран",
        "Часть 1 — § 22. Древняя Финикия",
        "Часть 1 — § 23. Древняя Палестина",
        "Часть 1 — § 24. Древняя Индия",
        "Часть 1 — § 25. Культура Древней Индии",
        "Часть 1 — § 26. Возникновение государства в Китае",
        "Часть 1 — § 27. Общество и культура Древнего Китая",
        "Часть 1 — § 28. Древнейшее население Америки",
        "Часть 1 — § 29. Цивилизация ольмеков",
        "Часть 2 — § 1. Природа и население Древней Греции",
        "Часть 2 — § 2. Минойский Крит и его культура",
        "Часть 2 — § 3. Ахейская Греция",
        "Часть 2 — § 4. Возникновение греческого полиса",
        "Часть 2 — § 5. Великая греческая колонизация",
        "Часть 2 — § 6. Древняя Спарта",
        "Часть 2 — § 7. Возникновение и развитие Афинского государства",
        "Часть 2 — § 8. Греко-персидские войны и расцвет Афин",
        "Часть 2 — § 9. Пелопоннесская война и упадок Афин",
        "Часть 2 — § 10. Держава Александра Македонского",
        "Часть 2 — § 11. Религия древних греков",
        "Часть 2 — § 12. Древнегреческая школа и научные знания",
        "Часть 2 — § 13. Древнегреческое искусство",
        "Часть 2 — § 14. Древнегреческий театр и Олимпийские игры",
        "Часть 2 — § 15. Повседневная жизнь древних греков",
        "Часть 2 — § 16. Эллинистическая культура",
        "Часть 2 — § 17. Легендарное начало Рима",
        "Часть 2 — § 18. Ранняя Римская республика",
        "Часть 2 — § 19. Завоевание Римом Италии",
        "Часть 2 — § 20. Завоевание Римом Средиземноморья",
        "Часть 2 — § 21. Земельная и военная реформы в Риме",
        "Часть 2 — § 22. Рабовладение в Риме",
        "Часть 2 — § 23. Падение Римской республики и создание империи",
        "Часть 2 — § 24. Власть римских императоров",
        "Часть 2 — § 25. Рим — столица империи",
        "Часть 2 — § 26. Культура Древнего Рима",
        "Часть 2 — § 27. Религия древних римлян",
        "Часть 2 — § 28. Христианство в Римской империи",
        "Часть 2 — § 29. Падение Западной Римской империи",
        "Часть 2 — § 30. Древние германцы",
        "Часть 2 — § 31. Древние славяне"
],
    "ГЕОГРАФИЯ":       ["Материки", "Климат", "Природные зоны"]    ,
    "БЕЛАРУСКАЯ МОВА": [
        "Чалавек і мова. Камунікатыўная функцыя мовы",
        "Вусная і пісьмовая формы маўлення. Віды маўленчай дзейнасці",
        "Умовы для ўспрымання і стварэння выказвання. Стылі маўлення",
        "Мастацкі, навуковы і гутарковы стылі маўлення",
        "Назоўнік. Род, лік, склон назоўнікаў",
        "Змяненне назоўнікаў у адзіночным і множным ліках",
        "Прыметнік. Сувязь прыметніка з назоўнікам",
        "Займеннік. Асабовыя займеннікі",
        "Дзеяслоў. Неазначальная форма. Часы дзеяслова",
        "Змяненне дзеясловаў па асобах і ліках",
        "Змяненне дзеясловаў прошлага часу па родах",
        "Тэкст. Прыметы тэксту",
        "План тэксту",
        "Тыпы маўлення: апавяданне, апісанне, разважанне",
        "Словазлучэнне",
        "Галоўнае і залежнае слова ў словазлучэнні",
        "Сказ як сінтаксічная адзінка",
        "Апавядальныя, пытальныя і пабуджальныя сказы",
        "Галоўныя члены сказа: дзейнік і выказнік",
        "Працяжнік паміж дзейнікам і выказнікам",
        "Даданыя члены сказа. Дапаўненне",
        "Азначэнне",
        "Акалічнасць",
        "Неразвітыя і развітыя сказы",
        "Патрабаванні да падрабязнага пераказу",
        "Сказы з аднароднымі членамі",
        "Знакі прыпынку ў сказах з аднароднымі членамі",
        "Сказы са звароткамі",
        "Складаныя сказы",
        "Простая мова",
        "Дыялог",
        "Гукі беларускай мовы",
        "Літара як знак гука",
        "Прызначэнне літар е, ё, ю, я, і",
        "Беларускі алфавіт. Назвы літар",
        "Склад",
        "Націск",
        "Правілы пераносу слоў",
        "Галосныя гукі",
        "Вымаўленне і правапіс галосных о, э, а",
        "Вымаўленне і правапіс галосных е, ё, я",
        "Спалучэнні іё (ыё), ія (ыя), іе (ые) у запазычаных словах",
        "Зычныя гукі",
        "Глухія, звонкія і санорныя зычныя",
        "Свісцячыя і шыпячыя зычныя",
        "Цвёрдыя, мяккія і зацвярдзелыя зычныя",
        "Мяккі знак і апостраф",
        "Зычныя [д] — [дз’], [т] — [ц’]",
        "Правапіс у, ў",
        "Падоўжаныя зычныя",
        "Прыстаўныя зычныя і галосныя",
        "Правапіс некаторых спалучэнняў зычных",
        "Лексічнае значэнне слова",
        "Адназначныя і мнагазначныя словы",
        "Прамое і пераноснае значэнне слова",
        "Сінонімы",
        "Антонімы",
        "Амонімы",
        "Агульнаўжывальныя словы і словы абмежаванага ўжытку",
        "Устарэлыя словы",
        "Неалагізмы",
        "Запазычаныя словы",
        "Фразеалагізмы",
        "Тэкст, тыпы маўлення. Арфаграфічныя і пунктуацыйныя правілы"
    ],
    "БЕЛАРУСКАЯ ЛІТАРАТУРА": [
        "Падарожжа па Краіне літаратуры",
        "Мой чароўны беларускі край",
        "Слова — радасць, слова — чары",
        "П. Броўка. Калі Ласка!",
        "Я. Янішчыц. Мова",
        "А. Грачанікаў. Дрымотна ціснуцца кусты",
        "У. Караткевіч. Бацькаўшчына",
        "За смугою стагоддзяў",
        "Вусная народная творчасць",
        "Народныя казкі",
        "Разумная дачка",
        "Залаты птах",
        "Музыкі",
        "Легенды",
        "Нарач",
        "Пестунь",
        "Загадкі",
        "Прыказкі",
        "Прыкметы і павер’і",
        "Казка — у жыцці падсказка",
        "Вусная народная творчасць і мастацкая літаратура",
        "М. Танк. Ля вогнішч начлежных",
        "Я. Колас. Крыніца",
        "У. Караткевіч. Нямоглы бацька",
        "А. Федарэнка. Падслуханая казка",
        "Прыроды вечная краса",
        "М. Багдановіч. Зімой",
        "А. Грачанікаў. Зоры спяваюць",
        "Эпітэт",
        "Я. Колас. Песня ляснога жаваранка",
        "Я. Колас. На рэчцы",
        "Параўнанне",
        "У. Караткевіч. Лісце",
        "А. Грачанікаў. Верасень",
        "П. Броўка. Кропля",
        "Сцежкамі дзяцінства",
        "Я. Колас. Дарэктар",
        "Я. Колас. У старых дубах",
        "Пра тэму літаратурнага твора",
        "М. Лынькоў. Васількі",
        "В. Зуёнак. Прыйдзі аднойчы",
        "А. Кудравец. Цітаўкі",
        "Пра сюжэт літаратурнага твора",
        "Г. Далідовіч. Страта",
        "М. Лужанін. Добры хлопец Дзік",
        "У. Караткевіч. Былі ў мяне мядзведзі",
        "Пра літаратурнага героя",
        "Прыгоды і падарожжы",
        "М. Лынькоў. Пра смелага ваяку Мішку і яго слаўных таварышаў"
    ]

};

// ---------- ЗАДАНИЯ 5 КЛАСС ----------

const tasks5Class = {

    "Повторение": [
        { difficulty: "Легко",   xp: 15, answer: "42",    question: "В первый день было продано 14 холодильников, во второй — в 2 раза больше. Сколько холодильников продано за два дня?" },
        { difficulty: "Легко",   xp: 15, answer: "7",     question: "Бабушка купила 2 кг яблок по 2 р. за килограмм и 1 кг винограда за 3 р. Сколько денег бабушка заплатила за покупку?" },
        { difficulty: "Средне", xp: 25, answer: "3",     question: "Теплоход за 6 ч прошёл 210 км, а поезд за 4 ч преодолел 420 км. Во сколько раз скорость поезда больше скорости теплохода?" },
        { difficulty: "Легко",   xp: 15, answer: "48",    question: "Найдите периметр бассейна, имеющего форму квадрата со стороной 12 м. Ответ в метрах." },
        { difficulty: "Легко",   xp: 15, answer: "35",    question: "В первом автобусе было 38 детей, а во втором — на 3 меньше. Сколько детей во втором автобусе?" },
        { difficulty: "Средне", xp: 25, answer: "42",    question: "Первый переводчик за день переводит 6 страниц, второй — 8 страниц. Сколько страниц переведут оба за 3 дня?" },
        { difficulty: "Средне", xp: 25, answer: "5",     question: "Площадь пола прямоугольной комнаты равна 15 м2. Найдите длину комнаты, если её ширина равна 3 м." },
        { difficulty: "Сложно", xp: 40, answer: "368",   question: "Пятиклассник за первую неделю прочитал 178 страниц, за вторую — 156 страниц. Осталось прочитать 34 страницы. Сколько страниц в книге?" },
        { difficulty: "Средне", xp: 25, answer: "107",   question: "Река Неман на территории Беларуси — 459 км, что на 352 км больше, чем на территории России. Сколько км реки на территории России?" },
        { difficulty: "Легко",   xp: 15, answer: "10",    question: "Ленту разрезали на две части: одна в 2 раза длиннее другой, равной 5 м. Какова длина большей части?" },
        { difficulty: "Средне", xp: 25, answer: "80",    question: "Первая автостоянка на 240 машин вмещает в 3 раза больше, чем вторая. Сколько мест на второй стоянке?" },
        { difficulty: "Средне", xp: 25, answer: "652",   question: "У Пети 278 марок, у Тани — на 96 больше. Сколько марок у Пети и Тани вместе?" },
        { difficulty: "Средне", xp: 25, answer: "368",   question: "Для школ закупили 276 волейбольных мячей, а баскетбольных — в 3 раза меньше. Сколько всего мячей закупили?" },
        { difficulty: "Средне", xp: 25, answer: "72",    question: "Поле имеет длину 27 м, ширина в 3 раза меньше. Найдите периметр поля. Ответ в метрах." },
        { difficulty: "Средне", xp: 25, answer: "72",    question: "Участвовали 36 конькобежцев, лыжников — в 3 раза больше. На сколько больше было лыжников?" },
        { difficulty: "Сложно", xp: 40, answer: "2840",  question: "В типографии было 8000 кг бумаги. В первый месяц израсходовали 2700 кг, во второй — на 240 кг меньше. Сколько кг осталось?" },
        { difficulty: "Средне", xp: 25, answer: "156",   question: "В трёх одинаковых автобусах 78 мест. Сколько мест в шести таких автобусах?" },
        { difficulty: "Сложно", xp: 40, answer: "85",    question: "В двух ящиках 120 кг чая. Если из первого выложить 32 кг, а во второй добавить 18 кг, чая станет поровну. Сколько кг было в первом ящике?" },
        { difficulty: "Сложно", xp: 50, answer: "15",    question: "Сумма трёх чисел равна 55. Сумма первого и второго — 32, разность третьего и первого — 8. Найдите первое число." },
        { difficulty: "Средне", xp: 25, answer: "540",   question: "Школьники 4 дня сажали по 75 деревьев, затем 3 дня — по 80. Сколько всего деревьев посадили?" },
        { difficulty: "Средне", xp: 25, answer: "87",    question: "Расстояние Минск — Брест 348 км. Поезд отправляется в 22:00, прибывает в 2:00. Найдите скорость поезда в км/ч." },
        { difficulty: "Сложно", xp: 40, answer: "520",   question: "Товарный поезд за 9 ч прошёл 450 км, его скорость на 15 км/ч меньше пассажирского. Сколько км пройдёт пассажирский за 8 ч?" }
    ],

    "Натуральные числа": [
        { difficulty: "Легко", xp: 15, answer: "8",      question: "В записи числа 5 073 948 261 использована каждая цифра по разу. Какая цифра в разряде единиц класса тысяч?" },
        { difficulty: "Легко", xp: 15, answer: "0",      question: "В числе 5 073 948 261 какая цифра в разряде сотен класса миллионов?" },
        { difficulty: "Легко", xp: 15, answer: "10",     question: "Запишите наименьшее двузначное число." },
        { difficulty: "Легко", xp: 15, answer: "999",    question: "Запишите наибольшее трёхзначное число." },
        { difficulty: "Легко", xp: 15, answer: "1000",   question: "Запишите наименьшее четырёхзначное число." },
        { difficulty: "Легко", xp: 15, answer: "99999",  question: "Запишите наибольшее пятизначное число." },
        { difficulty: "Средне", xp: 25, answer: "105",   question: "Задумали число, из него вычли 60, удвоили, снова вычли 60, снова удвоили, снова вычли 60 — получили 0. Какое число задумали?" },
        { difficulty: "Средне", xp: 25, answer: "8",     question: "Больному нужно принимать по 1 г лекарства 3 раза в день 21 день. В упаковке 8 таблеток по 1 г. Сколько упаковок нужно?" },
        { difficulty: "Легко", xp: 15, answer: "27406",  question: "Запишите число цифрами: двадцать семь тысяч четыреста шесть." },
        { difficulty: "Легко", xp: 15, answer: "508020", question: "Запишите число цифрами: пятьсот восемь тысяч двадцать." }
    ],

    "Сравнение чисел": [
        { difficulty: "Легко", xp: 15, answer: ">",     question: "Сравните: 407 и 49. Введите знак >, < или =." },
        { difficulty: "Легко", xp: 15, answer: "<",     question: "Сравните: 997 и 1003. Введите знак >, < или =." },
        { difficulty: "Легко", xp: 15, answer: "<",     question: "Сравните: 9999 и 10 000. Введите знак >, < или =." },
        { difficulty: "Средне", xp: 25, answer: "54",   question: "Запишите числа в порядке возрастания и укажите первое: 213, 54, 108, 4076, 580, 790, 9020, 3971, 8129." },
        { difficulty: "Средне", xp: 25, answer: "10001",question: "Запишите числа в порядке убывания и укажите первое: 4160, 518, 295, 4159, 6748, 10001, 6847, 83, 4444." }
    ],

    "Измерение отрезков": [
        { difficulty: "Легко", xp: 15, answer: "80",       question: "Сколько миллиметров в 8 см?" },
        { difficulty: "Легко", xp: 15, answer: "500",      question: "Сколько миллиметров в 5 дм?" },
        { difficulty: "Средне", xp: 25, answer: "1200000", question: "Сколько сантиметров в 12 км?" },
        { difficulty: "Легко", xp: 15, answer: "30",       question: "Выразите в метрах 3000 см." },
        { difficulty: "Средне", xp: 25, answer: "19 5",    question: "Выполните: 2 м 7 дм + 16 м 8 дм. Введите результат: метры и дециметры через пробел (например, 19 5)." }
    ],

    "Округление": [
        { difficulty: "Легко", xp: 15, answer: "4670",  question: "Округлите число 4674 до десятков." },
        { difficulty: "Легко", xp: 15, answer: "7250",  question: "Округлите число 7251 до десятков." },
        { difficulty: "Легко", xp: 15, answer: "300",   question: "Округлите число 297 до десятков." },
        { difficulty: "Средне", xp: 25, answer: "1400",  question: "Округлите число 1378 до сотен." },
        { difficulty: "Средне", xp: 25, answer: "50100", question: "Округлите число 50 084 до сотен." },
        { difficulty: "Средне", xp: 25, answer: "4000",  question: "Округлите число 3856 до тысяч." },
        { difficulty: "Средне", xp: 25, answer: "11000", question: "Округлите число 10 726 до тысяч." },
        { difficulty: "Средне", xp: 25, answer: "13000", question: "Округлите число 13 345 до тысяч." },
        { difficulty: "Сложно", xp: 35, answer: "30000", question: "Округлите число 26 481 до наивысшего разряда." },
        { difficulty: "Сложно", xp: 35, answer: "56300", question: "Округлите число 56 342 до сотен." }
    ],

    "Сложение и вычитание": [
        { difficulty: "Легко", xp: 15, answer: "37",     question: "Вычислите: 37 минус 0." },
        { difficulty: "Легко", xp: 15, answer: "0",      question: "Вычислите: 512 минус 512." },
        { difficulty: "Легко", xp: 15, answer: "7904",   question: "Вычислите: 7904 плюс 0." },
        { difficulty: "Средне", xp: 25, answer: "106401",question: "Вычислите: 89 587 плюс 16 814." },
        { difficulty: "Средне", xp: 25, answer: "35467", question: "Вычислите: 42 962 минус 7495." },
        { difficulty: "Средне", xp: 25, answer: "932",   question: "Вычислите: 2000 минус 1068." },
        { difficulty: "Средне", xp: 25, answer: "3889",  question: "Найдите x: x плюс 111 равно 4000." },
        { difficulty: "Средне", xp: 25, answer: "671",   question: "Найдите y: 1523 минус y равно 852." },
        { difficulty: "Средне", xp: 25, answer: "25700", question: "Вычислите, применяя законы сложения: 9081 плюс 15 700 плюс 919." },
        { difficulty: "Средне", xp: 25, answer: "60000", question: "Вычислите: (652 плюс 59 300) плюс 48." },
        { difficulty: "Сложно", xp: 35, answer: "7",     question: "На двух полках 19 книг. На одной на 5 больше. Сколько книг на меньшей полке?" },
        { difficulty: "Сложно", xp: 35, answer: "18",    question: "Бабушка собрала 51 кг моркови и капусты. Капусты на 15 кг больше. Сколько кг моркови?" },
        { difficulty: "Сложно", xp: 35, answer: "11",    question: "Провод длиной 34 см разрезали так, что одна часть на 12 см длиннее. Найдите меньшую часть в см." },
        { difficulty: "Сложно", xp: 35, answer: "13",    question: "На турбазе 30 палаток и домиков. Палаток на 4 больше. Сколько домиков?" },
        { difficulty: "Сложно", xp: 35, answer: "72",    question: "Продали 120 планшетов и компьютеров. Планшетов на 24 меньше. Сколько компьютеров продали?" },
        { difficulty: "Сложно", xp: 40, answer: "21",    question: "В двух ящиках 46 кг яблок, в одном на 4 кг больше. Сколько кг в меньшем ящике?" },
        { difficulty: "Сложно", xp: 40, answer: "58",    question: "На трёх улицах 162 дома. На второй на 8 меньше, чем на первой, на третьей на 4 больше, чем на второй. Сколько домов на первой улице?" }
    ],

    "Умножение и деление": [
        { difficulty: "Легко", xp: 15, answer: "6256",  question: "Вычислите: 92 умножить на 68." },
        { difficulty: "Средне", xp: 25, answer: "9342", question: "Вычислите: 346 умножить на 27." },
        { difficulty: "Легко", xp: 15, answer: "0",     question: "Вычислите: 417 умножить на 0." },
        { difficulty: "Средне", xp: 25, answer: "28296",question: "Вычислите: 786 умножить на 36." },
        { difficulty: "Средне", xp: 25, answer: "36",   question: "Вычислите: 576 разделить на 16." },
        { difficulty: "Средне", xp: 25, answer: "24",   question: "Вычислите: 888 разделить на 37." },
        { difficulty: "Легко", xp: 15, answer: "45",    question: "Вычислите: 45 разделить на 1." },
        { difficulty: "Средне", xp: 25, answer: "82",   question: "Найдите m: m умножить на 45 равно 3690." },
        { difficulty: "Средне", xp: 25, answer: "86",   question: "Найдите k: 60 630 разделить на k равно 705." },
        { difficulty: "Средне", xp: 25, answer: "2738", question: "Найдите a: a разделить на 37 равно 74." },
        { difficulty: "Средне", xp: 25, answer: "67400",question: "Вычислите, используя свойства умножения: 50 умножить на 2 умножить на 674." },
        { difficulty: "Средне", xp: 25, answer: "39300",question: "Вычислите: 25 умножить на 4 умножить на 393." },
        { difficulty: "Сложно", xp: 35, answer: "6",    question: "Магазин продал 18 ноутбуков и консолей, ноутбуков в 2 раза больше. Сколько консолей продано?" },
        { difficulty: "Сложно", xp: 35, answer: "550",  question: "Масса двух пакетов печенья 1650 г, один в 2 раза тяжелее другого. Какова масса меньшего пакета в граммах?" },
        { difficulty: "Сложно", xp: 35, answer: "32",   question: "В кружке по географии в 3 раза меньше детей, чем по математике. Географов на 16 меньше. Сколько всего детей в обоих кружках?" },
        { difficulty: "Сложно", xp: 35, answer: "21",   question: "В отеле купили 28 пылесосов и холодильников. Пылесосов в 3 раза меньше. Сколько холодильников?" },
        { difficulty: "Сложно", xp: 40, answer: "25",   question: "Отец старше сына на 20 лет, сын моложе в 5 раз. Сколько лет отцу?" },
        { difficulty: "Сложно", xp: 40, answer: "59",   question: "В поезде 413 пассажиров. Мужчин вчетверо больше, чем детей, женщин вдвое больше, чем детей. Сколько детей?" }
    ],

    "Степень": [
        { difficulty: "Легко", xp: 15, answer: "8",      question: "Вычислите: 2 в степени 3." },
        { difficulty: "Легко", xp: 15, answer: "25",     question: "Вычислите: 5 в степени 2." },
        { difficulty: "Легко", xp: 15, answer: "1",      question: "Вычислите: 1 в степени 6." },
        { difficulty: "Легко", xp: 15, answer: "81",     question: "Вычислите: 3 в степени 4." },
        { difficulty: "Средне", xp: 25, answer: "16",    question: "Вычислите: 2 в степени 4." },
        { difficulty: "Средне", xp: 25, answer: "36",    question: "Вычислите: 6 в степени 2." },
        { difficulty: "Средне", xp: 25, answer: "0",     question: "Вычислите: 0 в степени 5." },
        { difficulty: "Средне", xp: 25, answer: "64",    question: "Вычислите: 4 в степени 3." },
        { difficulty: "Средне", xp: 25, answer: "1000000",question: "Вычислите: 10 в степени 6." },
        { difficulty: "Сложно", xp: 35, answer: "100",   question: "Вычислите: (7 плюс 3) в квадрате." },
        { difficulty: "Сложно", xp: 35, answer: "58",    question: "Вычислите: 7 в квадрате плюс 3 в квадрате." },
        { difficulty: "Сложно", xp: 40, answer: "39",    question: "Вычислите: (5 в кубе минус 2 в кубе) разделить на (5 минус 2)." }
    ],

    "Деление с остатком": [
        { difficulty: "Легко", xp: 15, answer: "3",   question: "Сырок стоит 94 к. Сколько сырков можно купить на 3 р.?" },
        { difficulty: "Легко", xp: 15, answer: "4",   question: "Шоколадный батончик стоит 1 р. 65 к. Сколько батончиков можно купить на 7 р.?" },
        { difficulty: "Легко", xp: 15, answer: "13",  question: "Летние каникулы 92 дня. Сколько это полных недель?" },
        { difficulty: "Средне", xp: 25, answer: "2",  question: "23 человека построили по 3 в ряд. Сколько человек в последнем неполном ряду?" },
        { difficulty: "Средне", xp: 25, answer: "12", question: "150 карандашей раскладывают по 12 в коробку. Сколько полных коробок?" },
        { difficulty: "Средне", xp: 25, answer: "6",  question: "150 карандашей по 12 в коробку. Сколько карандашей останется?" },
        { difficulty: "Средне", xp: 25, answer: "6",  question: "В вагоне 36 мест по 4 в купе. В каком купе место номер 21?" },
        { difficulty: "Средне", xp: 25, answer: "9",  question: "В вагоне 36 мест по 4 в купе. В каком купе место номер 33?" },
        { difficulty: "Средне", xp: 25, answer: "11", question: "В 13-этажном доме квартиры с 1 по 52. На каком этаже квартира номер 43?" },
        { difficulty: "Сложно", xp: 35, answer: "42", question: "Издательство тратит 3450 листов в неделю. Пачка — 500 листов. Сколько пачек нужно на 6 недель?" }
    ],

    "Делители и кратные": [
        { difficulty: "Легко", xp: 15, answer: "3",   question: "Найдите НОД (6; 15)." },
        { difficulty: "Легко", xp: 15, answer: "30",  question: "Найдите НОК (6; 15)." },
        { difficulty: "Средне", xp: 25, answer: "8",  question: "Найдите НОД (24; 40)." },
        { difficulty: "Средне", xp: 25, answer: "120",question: "Найдите НОК (24; 40)." },
        { difficulty: "Средне", xp: 25, answer: "5",  question: "Найдите НОД (15; 20)." },
        { difficulty: "Средне", xp: 25, answer: "60", question: "Найдите НОК (15; 20)." },
        { difficulty: "Средне", xp: 25, answer: "9",  question: "Найдите НОД (18; 27; 45)." },
        { difficulty: "Средне", xp: 25, answer: "12", question: "Найдите НОД (12; 36; 60)." },
        { difficulty: "Сложно", xp: 35, answer: "12", question: "Для эстафеты надо разделить 36 мальчиков и 24 девочки на команды с равным числом. Какое наибольшее число команд?" },
        { difficulty: "Сложно", xp: 35, answer: "20", question: "Для поздравления купили 60 роз и 80 гвоздик. Какое наибольшее число одинаковых букетов можно составить?" }
    ],

    "Признаки делимости": [
        { difficulty: "Легко", xp: 15, answer: "да",  question: "Делится ли число 624 на 4? Ответ: да или нет." },
        { difficulty: "Легко", xp: 15, answer: "да",  question: "Делится ли число 7144 на 4? Ответ: да или нет." },
        { difficulty: "Легко", xp: 15, answer: "нет", question: "Делится ли число 926 на 4? Ответ: да или нет." },
        { difficulty: "Средне", xp: 25, answer: "7",  question: "Какую цифру нужно поставить вместо звёздочки в числе 218, чтобы оно делилось на 9?" },
        { difficulty: "Средне", xp: 25, answer: "5",  question: "Какую цифру нужно поставить вместо звёздочки в числе 67, чтобы оно делилось на 9?" },
        { difficulty: "Сложно", xp: 35, answer: "да", question: "Пятиклассник хотел купить 3 одинаковых блокнота. Продавец сказал 2 р. 51 к. Ошибся ли продавец? Ответ: да или нет." }
    ],

    "Простые числа": [
        { difficulty: "Легко", xp: 15, answer: "да",  question: "Является ли число 7 простым? Ответ: да или нет." },
        { difficulty: "Легко", xp: 15, answer: "нет", question: "Является ли число 9 простым? Ответ: да или нет." },
        { difficulty: "Легко", xp: 15, answer: "да",  question: "Является ли число 17 простым? Ответ: да или нет." },
        { difficulty: "Средне", xp: 25, answer: "да", question: "Является ли число 137 простым? Ответ: да или нет." },
        { difficulty: "Средне", xp: 25, answer: "нет",question: "Является ли число 437 простым? Ответ: да или нет." },
        { difficulty: "Средне", xp: 25, answer: "2*2*2*3", question: "Разложите число 24 на простые множители. Формат: 2*2*2*3" },
        { difficulty: "Средне", xp: 25, answer: "3*3*5",   question: "Разложите число 45 на простые множители. Формат: 3*3*5" },
        { difficulty: "Средне", xp: 25, answer: "2*2*2*2*2*2*2", question: "Разложите число 128 на простые множители. Формат: 2*2*2*2*2*2*2" }
    ],

    "Уравнения": [
        { difficulty: "Легко", xp: 15, answer: "1567", question: "Решите уравнение: x плюс 5435 равно 7002." },
        { difficulty: "Легко", xp: 15, answer: "7006", question: "Решите уравнение: x минус 6308 равно 698." },
        { difficulty: "Легко", xp: 15, answer: "889",  question: "Решите уравнение: 1111 минус m равно 222." },
        { difficulty: "Средне", xp: 25, answer: "6064",  question: "Решите уравнение: m умножить на 8 равно 48 512." },
        { difficulty: "Средне", xp: 25, answer: "32070", question: "Решите уравнение: 801 750 разделить на k равно 25." },
        { difficulty: "Средне", xp: 25, answer: "6936",  question: "Решите уравнение: a разделить на 17 равно 408." },
        { difficulty: "Средне", xp: 25, answer: "4080",  question: "Решите уравнение: 9 умножить на b равно 36 720." },
        { difficulty: "Сложно", xp: 35, answer: "22732", question: "Решите уравнение: (a минус 6502) плюс 23 916 равно 40 146." },
        { difficulty: "Сложно", xp: 35, answer: "5156",  question: "Решите уравнение: (y плюс 4509) минус 949 равно 8716." },
        { difficulty: "Сложно", xp: 35, answer: "179",   question: "Решите уравнение: 26 умножить на (x плюс 427) равно 15 756." },
        { difficulty: "Сложно", xp: 40, answer: "478",   question: "Решите уравнение: 6 умножить на x плюс 27 665 равно 30 533." },
        { difficulty: "Сложно", xp: 40, answer: "3909",  question: "Решите уравнение: 23 154 минус 4 умножить на x равно 7518." },
        { difficulty: "Сложно", xp: 40, answer: "1254400",question: "Решите уравнение: a разделить на 140 минус 564 равно 8396." }
    ],

    "Формулы": [
        { difficulty: "Легко", xp: 15, answer: "54",  question: "Прямоугольник: a = 12 см, b = 15 см. Найдите периметр в см." },
        { difficulty: "Легко", xp: 15, answer: "168", question: "Прямоугольник: a = 34 м, b = 50 м. Найдите периметр в м." },
        { difficulty: "Легко", xp: 15, answer: "124", question: "Квадрат со стороной a = 31 см. Найдите периметр в см." },
        { difficulty: "Легко", xp: 15, answer: "240", question: "Квадрат со стороной a = 60 дм. Найдите периметр в дм." },
        { difficulty: "Средне", xp: 25, answer: "39", question: "Катер против течения идёт со скоростью 36 км/ч, скорость течения 3 км/ч. Найдите собственную скорость катера." },
        { difficulty: "Средне", xp: 25, answer: "4",  question: "Скорость теплохода против течения 54 км/ч, собственная 58 км/ч. Найдите скорость течения." },
        { difficulty: "Средне", xp: 25, answer: "4",  question: "Скорость по течению 36 км/ч, против — 28 км/ч. Найдите скорость течения." },
        { difficulty: "Сложно", xp: 35, answer: "4",  question: "Теплоход: собственная 23 км/ч, течение 5 км/ч, расстояние 112 км по течению. Сколько часов?" }
    ],

    "Задачи с уравнениями": [
        { difficulty: "Средне", xp: 25, answer: "2",  question: "Масса арбуза и дыни 10 кг, арбуз в 4 раза тяжелее. Какова масса дыни в кг?" },
        { difficulty: "Средне", xp: 25, answer: "20", question: "Блузка дешевле платья на 40 р. Платье в 3 раза дороже. Сколько стоит блузка?" },
        { difficulty: "Сложно", xp: 35, answer: "33", question: "С двух грядок собрали 83 кг моркови. С одной на 17 кг больше. Сколько кг с меньшей грядки?" },
        { difficulty: "Сложно", xp: 35, answer: "22", question: "В двух спортивных секциях 48 детей. В одной на 4 меньше. Сколько детей в меньшей секции?" },
        { difficulty: "Сложно", xp: 40, answer: "48", question: "В парке посадили 64 саженца берёзы и дуба, берёз в 3 раза больше. Сколько саженцев берёз?" },
        { difficulty: "Сложно", xp: 40, answer: "9",  question: "Мальчик пробежал в 3 раза больше сестры, на 6 км больше. Сколько км пробежал мальчик?" }
    ],

    "Углы": [
        { difficulty: "Легко", xp: 15, answer: "90",    question: "Прямой угол содержит сколько градусов?" },
        { difficulty: "Легко", xp: 15, answer: "180",   question: "Развёрнутый угол содержит сколько градусов?" },
        { difficulty: "Легко", xp: 15, answer: "острый",question: "Угол 20 градусов — какой? Ответ: острый, прямой или тупой." },
        { difficulty: "Легко", xp: 15, answer: "тупой", question: "Угол 128 градусов — какой? Ответ: острый, прямой или тупой." },
        { difficulty: "Легко", xp: 15, answer: "тупой", question: "Угол 171 градус — какой? Ответ: острый, прямой или тупой." },
        { difficulty: "Средне", xp: 25, answer: "25", question: "Прямой угол разделили на два так, что первый на 40 градусов больше второго. Сколько градусов в меньшем угле?" },
        { difficulty: "Средне", xp: 25, answer: "20", question: "Один угол на 60 градусов меньше другого и в 4 раза меньше. Сколько градусов в меньшем угле?" },
        { difficulty: "Сложно", xp: 35, answer: "40", question: "Развёрнутый угол разделили на три: первый в 3 раза меньше второго и в 2 раза больше третьего. Сколько градусов в первом угле?" },
        { difficulty: "Средне", xp: 25, answer: "180",question: "Какой угол между часовой и минутной стрелками в 6 часов?" },
        { difficulty: "Средне", xp: 25, answer: "90", question: "Какой угол между часовой и минутной стрелками в 3 часа?" }
    ]
,

    "Обыкновенные дроби": [
        { difficulty: "Легко", xp: 15, answer: "1/2", question: "Запишите дробь: из 8 равных частей взяли 4." },
        { difficulty: "Легко", xp: 15, answer: "3/5", question: "Какая часть целого соответствует 3 взятым частям из 5 равных?" },
        { difficulty: "Средне", xp: 25, answer: "7/10", question: "Запишите дробь: семь десятых." },
        { difficulty: "Средне", xp: 25, answer: "2/3", question: "В саду 12 деревьев, две трети из них — яблони. Сколько яблонь?" },
    ],

    "Деление и дроби. Основное свойство дроби": [
        { difficulty: "Легко", xp: 15, answer: "3/4", question: "Выполните деление 3 : 4 и запишите результат дробью." },
        { difficulty: "Легко", xp: 15, answer: "1/2", question: "Сократите дробь 6/12." },
        { difficulty: "Средне", xp: 25, answer: "5/8", question: "Какая дробь равна 10/16 после сокращения?" },
        { difficulty: "Средне", xp: 25, answer: "3/7", question: "Разделите 3 одинаковых пирога поровну между 7 детьми. Какая доля пирога достанется каждому?" },
    ],

    "Правильные и неправильные дроби. Смешанные числа": [
        { difficulty: "Легко", xp: 15, answer: "правильная", question: "Дробь 3/8 — правильная или неправильная?" },
        { difficulty: "Легко", xp: 15, answer: "9/4", question: "Запишите неправильную дробь для смешанного числа 2 1/4." },
        { difficulty: "Средне", xp: 25, answer: "2 1/3", question: "Представьте дробь 7/3 в виде смешанного числа." },
        { difficulty: "Средне", xp: 25, answer: "11/5", question: "Запишите смешанное число 2 1/5 в виде неправильной дроби." },
    ],

    "Сравнение дробных чисел": [
        { difficulty: "Легко", xp: 15, answer: ">", question: "Сравните 5/6 и 3/6. Введите знак >, < или =." },
        { difficulty: "Легко", xp: 15, answer: "<", question: "Сравните 2/7 и 5/7. Введите знак >, < или =." },
        { difficulty: "Средне", xp: 25, answer: "=", question: "Сравните 1/2 и 4/8. Введите знак >, < или =." },
        { difficulty: "Средне", xp: 25, answer: "3/4", question: "Какая дробь больше: 2/3 или 3/4? Запишите большую дробь." },
    ],

    "Сложение и вычитание обыкновенных дробей": [
        { difficulty: "Легко", xp: 15, answer: "5/9", question: "Вычислите 2/9 + 3/9." },
        { difficulty: "Легко", xp: 15, answer: "1/7", question: "Вычислите 5/7 - 4/7." },
        { difficulty: "Средне", xp: 25, answer: "5/6", question: "Вычислите 1/2 + 1/3." },
        { difficulty: "Средне", xp: 25, answer: "1/2", question: "Вычислите 5/6 - 1/3." },
    ],

    "Сложение и вычитание смешанных чисел": [
        { difficulty: "Легко", xp: 15, answer: "4 1/5", question: "Вычислите 2 3/5 + 1 3/5." },
        { difficulty: "Легко", xp: 15, answer: "2 1/4", question: "Вычислите 3 3/4 - 1 1/2." },
        { difficulty: "Средне", xp: 25, answer: "5 1/6", question: "Вычислите 2 2/3 + 2 1/2." },
        { difficulty: "Средне", xp: 25, answer: "2 5/12", question: "Вычислите 4 1/6 - 1 3/4." },
    ],

    "Умножение дробных чисел": [
        { difficulty: "Легко", xp: 15, answer: "2/5", question: "Вычислите 2/3 × 3/5." },
        { difficulty: "Легко", xp: 15, answer: "3/8", question: "Вычислите 3/4 × 1/2." },
        { difficulty: "Средне", xp: 25, answer: "5/6", question: "Вычислите 5/9 × 3/2." },
        { difficulty: "Средне", xp: 25, answer: "2 1/4", question: "Вычислите 1 1/2 × 1 1/2." },
    ],

    "Деление дробных чисел": [
        { difficulty: "Легко", xp: 15, answer: "1/2", question: "Вычислите 1/4 : 1/2." },
        { difficulty: "Легко", xp: 15, answer: "3", question: "Вычислите 3/4 : 1/4." },
        { difficulty: "Средне", xp: 25, answer: "2/3", question: "Вычислите 4/5 : 6/5." },
        { difficulty: "Средне", xp: 25, answer: "1 1/2", question: "Вычислите 3/4 : 1/2." },
    ],

    "Задачи на все действия с дробными числами": [
        { difficulty: "Средне", xp: 25, answer: "3/4", question: "Вычислите: 1/2 + 1/3 - 1/12." },
        { difficulty: "Средне", xp: 25, answer: "2 1/4", question: "Вычислите: 3 - 3/4." },
        { difficulty: "Сложно", xp: 35, answer: "5/6", question: "Вычислите: 2/3 × 5/4." },
        { difficulty: "Сложно", xp: 35, answer: "1/2", question: "Вычислите: (3/4 - 1/4) : 1." },
    ],

    "Задачи на применение дробей": [
        { difficulty: "Легко", xp: 15, answer: "80", question: "В классе 120 книг. Две трети книг — художественные. Сколько художественных книг?" },
        { difficulty: "Средне", xp: 25, answer: "30", question: "В кружке 12 учеников, это две пятых всех участников. Сколько участников всего?" },
        { difficulty: "Средне", xp: 25, answer: "45", question: "В коробке 60 карандашей. Три четверти раздали. Сколько карандашей раздали?" },
        { difficulty: "Сложно", xp: 35, answer: "24", question: "Отрезок длиной 36 см. Две трети отрезка покрасили. Сколько сантиметров покрасили?" },
    ],

    "Параллельные и перпендикулярные прямые": [
        { difficulty: "Легко", xp: 15, answer: "перпендикулярные", question: "Две прямые пересекаются под углом 90 градусов. Как они называются?" },
        { difficulty: "Легко", xp: 15, answer: "параллельные", question: "Прямые на плоскости не пересекаются. Как они называются?" },
        { difficulty: "Средне", xp: 25, answer: "90", question: "Какой угол образуют перпендикулярные прямые?" },
        { difficulty: "Средне", xp: 25, answer: "да", question: "Могут ли две параллельные прямые пересекаться? Ответ: да или нет." },
    ],

    "Ломаная. Многоугольник. Периметр многоугольника": [
        { difficulty: "Легко", xp: 15, answer: "4", question: "Сколько сторон у четырёхугольника?" },
        { difficulty: "Легко", xp: 15, answer: "30", question: "Найдите периметр треугольника со сторонами 8 см, 10 см и 12 см." },
        { difficulty: "Средне", xp: 25, answer: "36", question: "Периметр квадрата со стороной 9 см равен сколько см?" },
        { difficulty: "Средне", xp: 25, answer: "26", question: "Периметр прямоугольника со сторонами 6 см и 7 см равен сколько см?" },
    ],

    "Площадь. Единицы измерения площади": [
        { difficulty: "Легко", xp: 15, answer: "100", question: "Сколько квадратных сантиметров в 1 дм²?" },
        { difficulty: "Легко", xp: 15, answer: "10000", question: "Сколько квадратных сантиметров в 1 м²?" },
        { difficulty: "Средне", xp: 25, answer: "48", question: "Найдите площадь прямоугольника 6 см × 8 см." },
        { difficulty: "Средне", xp: 25, answer: "72", question: "Прямоугольник имеет площадь 72 см² и ширину 8 см. Найдите длину." },
    ],

    "Площадь прямоугольного треугольника и некоторых видов многоугольников": [
        { difficulty: "Легко", xp: 15, answer: "12", question: "Найдите площадь прямоугольного треугольника с катетами 4 см и 6 см." },
        { difficulty: "Средне", xp: 25, answer: "30", question: "Найдите площадь треугольника с основанием 10 см и высотой 6 см." },
        { difficulty: "Средне", xp: 25, answer: "35", question: "Найдите площадь параллелограмма с основанием 7 см и высотой 5 см." },
        { difficulty: "Сложно", xp: 35, answer: "42", question: "Трапеция имеет основания 6 см и 8 см и высоту 6 см. Найдите её площадь." },
    ],

    "Среднее арифметическое нескольких чисел": [
        { difficulty: "Легко", xp: 15, answer: "5", question: "Найдите среднее арифметическое чисел 3, 5 и 7." },
        { difficulty: "Легко", xp: 15, answer: "10", question: "Найдите среднее арифметическое чисел 8 и 12." },
        { difficulty: "Средне", xp: 25, answer: "15", question: "Среднее арифметическое трёх чисел равно 15. Чему равна их сумма?" },
        { difficulty: "Средне", xp: 25, answer: "12", question: "Среднее арифметическое чисел 10, 14 и 12 равно чему?" },
    ],

    "Линейные и столбчатые диаграммы": [
        { difficulty: "Легко", xp: 15, answer: "5", question: "На диаграмме показано: понедельник — 3 книги, вторник — 5, среда — 4. В какой день прочитали больше всего? Ответьте числом книг." },
        { difficulty: "Легко", xp: 15, answer: "12", question: "По столбчатой диаграмме: 4, 7 и 1 предмет. Сколько предметов всего?" },
        { difficulty: "Средне", xp: 25, answer: "8", question: "Продажи по дням: 6, 8, 5, 7. Какое значение максимальное?" },
        { difficulty: "Средне", xp: 25, answer: "2", question: "Значения на линейной диаграмме: 4, 6, 5, 7. На сколько последний показатель больше первого?" },
    ],

    "Прямоугольный параллелепипед. Куб": [
        { difficulty: "Легко", xp: 15, answer: "6", question: "Сколько граней у прямоугольного параллелепипеда?" },
        { difficulty: "Легко", xp: 15, answer: "8", question: "Сколько вершин у куба?" },
        { difficulty: "Средне", xp: 25, answer: "12", question: "Сколько рёбер у прямоугольного параллелепипеда?" },
        { difficulty: "Средне", xp: 25, answer: "да", question: "Все грани куба — квадраты. Ответ: да или нет." },
    ],

    "Объём. Единицы измерения объёма. Объём прямоугольного параллелепипеда": [
        { difficulty: "Легко", xp: 15, answer: "1000", question: "Сколько кубических сантиметров в 1 дм³?" },
        { difficulty: "Легко", xp: 15, answer: "24", question: "Найдите объём параллелепипеда 2 см × 3 см × 4 см." },
        { difficulty: "Средне", xp: 25, answer: "120", question: "Параллелепипед имеет размеры 5 см, 4 см и 6 см. Найдите объём в см³." },
        { difficulty: "Сложно", xp: 35, answer: "160", question: "Бассейн длиной 10 м, шириной 4 м и глубиной 4 м. Найдите объём в м³." },
    ]
};

// ---------- ДЕМО-ЗАДАНИЯ ДЛЯ ДРУГИХ ПРЕДМЕТОВ ----------

const tasks = {
    "РУССКИЙ ЯЗЫК": {
        "Текст": [
        { difficulty: "Легко", xp: 15, answer: "текст", question: "Связанные по смыслу предложения, объединённые общей темой, образуют что?" },
        { difficulty: "Средне", xp: 25, answer: "тема", question: "Что объединяет содержание текста в одно целое?" },
    ],

        "Словосочетание. Предложение": [
        { difficulty: "Легко", xp: 15, answer: "словосочетание", question: "Как называется сочетание двух или нескольких слов, связанных по смыслу и грамматически?" },
        { difficulty: "Средне", xp: 25, answer: "предложение", question: "Какая синтаксическая единица выражает законченную мысль?" },
    ],

        "Состав слова. Орфограмма": [
        { difficulty: "Легко", xp: 15, answer: "корень", question: "Как называется главная значимая часть слова, общая для родственных слов?" },
        { difficulty: "Средне", xp: 25, answer: "орфограмма", question: "Как называется место в слове, где нужно выбрать правильное написание?" },
    ],

        "Правописание": [
        { difficulty: "Легко", xp: 15, answer: "заглавная", question: "С какой буквы пишутся имена собственные?" },
        { difficulty: "Средне", xp: 25, answer: "жи", question: "Какую букву нужно написать после ж в сочетании жи?" },
    ],

        "Части речи": [
        { difficulty: "Легко", xp: 15, answer: "существительное", question: "Какая часть речи отвечает на вопросы кто и что?" },
        { difficulty: "Средне", xp: 25, answer: "глагол", question: "Какая часть речи обозначает действие предмета?" },
    ],

        "Язык и речь": [
        { difficulty: "Легко", xp: 15, answer: "речь", question: "Как называется использование языка для общения?" },
        { difficulty: "Средне", xp: 25, answer: "общение", question: "Для чего прежде всего используется речь? Ответ одним словом." },
    ],

        "Культура устной и письменной речи. Нормы литературного языка": [
        { difficulty: "Легко", xp: 15, answer: "нормы", question: "Как называются общепринятые правила употребления языка?" },
        { difficulty: "Средне", xp: 25, answer: "литературный", question: "Какой язык соответствует установленным нормам: литературный или разговорный?" },
    ],

        "Орфоэпическая, орфографическая, словообразовательная нормы": [
        { difficulty: "Легко", xp: 15, answer: "орфоэпическая", question: "Какая норма регулирует правильное произношение слов?" },
        { difficulty: "Средне", xp: 25, answer: "орфографическая", question: "Какая норма регулирует правильное написание слов?" },
    ],

        "Морфологическая, синтаксическая, пунктуационная нормы": [
        { difficulty: "Легко", xp: 15, answer: "пунктуационная", question: "Какая норма регулирует постановку знаков препинания?" },
        { difficulty: "Средне", xp: 25, answer: "синтаксическая", question: "Какая норма регулирует построение словосочетаний и предложений?" },
    ],

        "Качества речи. Точность и логичность речи": [
        { difficulty: "Легко", xp: 15, answer: "точность", question: "Как называется соответствие высказывания содержанию и действительности?" },
        { difficulty: "Средне", xp: 25, answer: "логичность", question: "Как называется последовательность и связность мыслей в речи?" },
    ],

        "Богатство, выразительность, чистота и уместность речи": [
        { difficulty: "Легко", xp: 15, answer: "уместность", question: "Какое качество речи означает соответствие ситуации общения?" },
        { difficulty: "Средне", xp: 25, answer: "выразительность", question: "Какое качество речи помогает сделать высказывание образным и эмоциональным?" },
    ],

        "Диалог. Монолог": [
        { difficulty: "Легко", xp: 15, answer: "диалог", question: "Разговор двух или нескольких участников называется как?" },
        { difficulty: "Средне", xp: 25, answer: "монолог", question: "Речь одного человека называется как?" },
    ],

        "Признаки речевой ситуации": [
        { difficulty: "Легко", xp: 15, answer: "адресат", question: "Как называется тот, к кому обращена речь?" },
        { difficulty: "Средне", xp: 25, answer: "цель", question: "Что определяет, зачем человек создаёт высказывание?" },
    ],

        "Разговорный, научный и художественный стили речи": [
        { difficulty: "Легко", xp: 15, answer: "научный", question: "Какой стиль используют для точного сообщения знаний?" },
        { difficulty: "Средне", xp: 25, answer: "художественный", question: "Какой стиль часто использует образы и выразительные средства?" },
    ],

        "Официально-деловой, публицистический стили речи": [
        { difficulty: "Легко", xp: 15, answer: "официально-деловой", question: "Какой стиль характерен для документов и официальных обращений?" },
        { difficulty: "Средне", xp: 25, answer: "публицистический", question: "Какой стиль часто используется в газетах и общественных выступлениях?" },
    ],

        "Лексическая норма": [
        { difficulty: "Легко", xp: 15, answer: "значение", question: "Что нужно учитывать, выбирая слово по лексической норме?" },
        { difficulty: "Средне", xp: 25, answer: "точно", question: "Нужно выбирать слово так, чтобы оно передавало мысль как?" },
    ],

        "Словосочетание": [
        { difficulty: "Легко", xp: 15, answer: "главное", question: "Как называется слово, от которого задаётся вопрос к зависимому?" },
        { difficulty: "Средне", xp: 25, answer: "зависимое", question: "Как называется слово, к которому задаётся вопрос от главного?" },
    ],

        "Предложение. Виды предложений по цели высказывания и по интонации": [
        { difficulty: "Легко", xp: 15, answer: "вопросительное", question: "Как называется предложение, содержащее вопрос?" },
        { difficulty: "Средне", xp: 25, answer: "восклицательное", question: "Как называется предложение, произнесённое с сильным чувством?" },
    ],

        "Главные члены предложения": [
        { difficulty: "Легко", xp: 15, answer: "подлежащее", question: "Как называется главный член предложения, отвечающий на вопросы кто что?" },
        { difficulty: "Средне", xp: 25, answer: "сказуемое", question: "Как называется главный член, который сообщает о действии или состоянии подлежащего?" },
    ],

        "Второстепенные члены предложения": [
        { difficulty: "Легко", xp: 15, answer: "дополнение", question: "Какой второстепенный член отвечает на вопросы косвенных падежей?" },
        { difficulty: "Средне", xp: 25, answer: "определение", question: "Какой второстепенный член обозначает признак предмета?" },
    ],

        "Однородные члены предложения": [
        { difficulty: "Легко", xp: 15, answer: "однородные", question: "Члены предложения, отвечающие на один вопрос и относящиеся к одному слову, называются как?" },
        { difficulty: "Средне", xp: 25, answer: "перечисление", question: "Какой смысл часто выражает ряд однородных членов?" },
    ],

        "Обращение": [
        { difficulty: "Легко", xp: 15, answer: "обращение", question: "Как называется слово, обозначающее того, к кому обращаются с речью?" },
        { difficulty: "Средне", xp: 25, answer: "запятые", question: "Чем обычно выделяется обращение в предложении?" },
    ],

        "Сложное предложение": [
        { difficulty: "Легко", xp: 15, answer: "два", question: "Сколько или более грамматических основ может быть в сложном предложении?" },
        { difficulty: "Средне", xp: 25, answer: "части", question: "Как называются части, из которых состоит сложное предложение?" },
    ],

        "Предложения с прямой речью": [
        { difficulty: "Легко", xp: 15, answer: "прямая", question: "Как называется дословно переданная речь другого человека?" },
        { difficulty: "Средне", xp: 25, answer: "кавычки", question: "Какой знак часто используется для оформления цитируемой прямой речи в тексте?" },
    ],

        "Понятие о тексте. Основные признаки текста": [
        { difficulty: "Легко", xp: 15, answer: "связность", question: "Какой признак текста показывает связь предложений между собой?" },
        { difficulty: "Средне", xp: 25, answer: "цельность", question: "Какой признак текста означает объединённость общей темой и смыслом?" },
    ],

        "Виды и средства связи предложений в тексте": [
        { difficulty: "Легко", xp: 15, answer: "местоимения", question: "Какую часть речи часто используют для связи предложений, заменяя уже названные слова?" },
        { difficulty: "Средне", xp: 25, answer: "повтор", question: "Как называется повторение ключевого слова как средство связи предложений?" },
    ],

        "Типы текста: повествование, описание, рассуждение": [
        { difficulty: "Легко", xp: 15, answer: "повествование", question: "Какой тип текста рассказывает о последовательности событий?" },
        { difficulty: "Средне", xp: 25, answer: "описание", question: "Какой тип текста изображает признаки предмета или явления?" },
    ]
    },
    "АНГЛИЙСКИЙ ЯЗЫК": {
        "Unit 1. In summer — Lesson 1. Back to school": [
            { difficulty: "Легко", xp: 15, answer: "school", question: "Какое ключевое английское слово встречается в названии этой темы: «school»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "school", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 1. In summer — Lesson 2. Holiday photographs": [
            { difficulty: "Легко", xp: 15, answer: "photographs", question: "Какое ключевое английское слово встречается в названии этой темы: «photographs»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "photographs", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 1. In summer — Lesson 3. At the seaside": [
            { difficulty: "Легко", xp: 15, answer: "seaside", question: "Какое ключевое английское слово встречается в названии этой темы: «seaside»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "seaside", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 1. In summer — Lesson 4. In the mountains": [
            { difficulty: "Легко", xp: 15, answer: "mountains", question: "Какое ключевое английское слово встречается в названии этой темы: «mountains»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "mountains", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 1. In summer — Lesson 5. Summer stories": [
            { difficulty: "Легко", xp: 15, answer: "stories", question: "Какое ключевое английское слово встречается в названии этой темы: «stories»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "stories", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 1. In summer — Lesson 6. I know what you did last summer": [
            { difficulty: "Легко", xp: 15, answer: "last", question: "Какое ключевое английское слово встречается в названии этой темы: «last»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "last", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 1. In summer — Lesson 7. Summer fun": [
            { difficulty: "Легко", xp: 15, answer: "fun", question: "Какое ключевое английское слово встречается в названии этой темы: «fun»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "fun", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 1. In summer — Lesson 8. What happened?": [
            { difficulty: "Легко", xp: 15, answer: "happened", question: "Какое ключевое английское слово встречается в названии этой темы: «happened»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "happened", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 1. In summer — Lesson 9. Get a medal!": [
            { difficulty: "Легко", xp: 15, answer: "medal", question: "Какое ключевое английское слово встречается в названии этой темы: «medal»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "medal", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 1. In summer — Lesson 10. Favourite summer moments": [
            { difficulty: "Легко", xp: 15, answer: "moments", question: "Какое ключевое английское слово встречается в названии этой темы: «moments»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "moments", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 1. In summer — Lesson 11. Picture stories": [
            { difficulty: "Легко", xp: 15, answer: "stories", question: "Какое ключевое английское слово встречается в названии этой темы: «stories»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "stories", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 1. In summer — Lesson 12. Reading for pleasure: Humpty Dumpty": [
            { difficulty: "Легко", xp: 15, answer: "dumpty", question: "Какое ключевое английское слово встречается в названии этой темы: «Dumpty»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "dumpty", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 2. Be active! — Lesson 1. Favourite day": [
            { difficulty: "Легко", xp: 15, answer: "favourite", question: "Какое ключевое английское слово встречается в названии этой темы: «Favourite»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "favourite", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 2. Be active! — Lesson 2. Likes and dislikes": [
            { difficulty: "Легко", xp: 15, answer: "dislikes", question: "Какое ключевое английское слово встречается в названии этой темы: «dislikes»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "dislikes", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 2. Be active! — Lesson 3. Bright autumn festival": [
            { difficulty: "Легко", xp: 15, answer: "festival", question: "Какое ключевое английское слово встречается в названии этой темы: «festival»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "festival", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 2. Be active! — Lesson 4. Be happy!": [
            { difficulty: "Легко", xp: 15, answer: "happy", question: "Какое ключевое английское слово встречается в названии этой темы: «happy»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "happy", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 2. Be active! — Lesson 5. In the park": [
            { difficulty: "Легко", xp: 15, answer: "park", question: "Какое ключевое английское слово встречается в названии этой темы: «park»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "park", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 2. Be active! — Lesson 6. Out for a walk": [
            { difficulty: "Легко", xp: 15, answer: "walk", question: "Какое ключевое английское слово встречается в названии этой темы: «walk»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "walk", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 2. Be active! — Lesson 7. Fun weekend": [
            { difficulty: "Легко", xp: 15, answer: "weekend", question: "Какое ключевое английское слово встречается в названии этой темы: «weekend»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "weekend", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 2. Be active! — Lesson 8. Weekend recount": [
            { difficulty: "Легко", xp: 15, answer: "recount", question: "Какое ключевое английское слово встречается в названии этой темы: «recount»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "recount", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 2. Be active! — Lesson 9. Get a medal!": [
            { difficulty: "Легко", xp: 15, answer: "medal", question: "Какое ключевое английское слово встречается в названии этой темы: «medal»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "medal", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 2. Be active! — Lesson 10. Weekend planner": [
            { difficulty: "Легко", xp: 15, answer: "planner", question: "Какое ключевое английское слово встречается в названии этой темы: «planner»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "planner", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 2. Be active! — Lesson 11. What a day!": [
            { difficulty: "Легко", xp: 15, answer: "day", question: "Какое ключевое английское слово встречается в названии этой темы: «day»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "day", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 2. Be active! — Lesson 12. Reading for pleasure: Teddy and Lucky": [
            { difficulty: "Легко", xp: 15, answer: "lucky", question: "Какое ключевое английское слово встречается в названии этой темы: «Lucky»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "lucky", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 3. What’s on TV? — Lesson 1. Do you like TV?": [
            { difficulty: "Легко", xp: 15, answer: "like", question: "Какое ключевое английское слово встречается в названии этой темы: «like»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "like", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 3. What’s on TV? — Lesson 2. Films for you and me": [
            { difficulty: "Легко", xp: 15, answer: "films", question: "Какое ключевое английское слово встречается в названии этой темы: «Films»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "films", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 3. What’s on TV? — Lesson 3. What time is it?": [
            { difficulty: "Легко", xp: 15, answer: "time", question: "Какое ключевое английское слово встречается в названии этой темы: «time»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "time", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 3. What’s on TV? — Lesson 4. How often do you watch TV?": [
            { difficulty: "Легко", xp: 15, answer: "watch", question: "Какое ключевое английское слово встречается в названии этой темы: «watch»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "watch", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 3. What’s on TV? — Lesson 5. Recommend a TV show!": [
            { difficulty: "Легко", xp: 15, answer: "show", question: "Какое ключевое английское слово встречается в названии этой темы: «show»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "show", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 3. What’s on TV? — Lesson 6. The history of cartoons": [
            { difficulty: "Легко", xp: 15, answer: "cartoons", question: "Какое ключевое английское слово встречается в названии этой темы: «cartoons»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "cartoons", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 3. What’s on TV? — Lesson 7. Winnie-the-Pooh and all, all, all": [
            { difficulty: "Легко", xp: 15, answer: "winnie-the-pooh", question: "Какое ключевое английское слово встречается в названии этой темы: «Winnie-the-Pooh»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "winnie-the-pooh", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 3. What’s on TV? — Lesson 8. My favourite cartoon character": [
            { difficulty: "Легко", xp: 15, answer: "character", question: "Какое ключевое английское слово встречается в названии этой темы: «character»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "character", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 3. What’s on TV? — Lesson 9. The quiz": [
            { difficulty: "Легко", xp: 15, answer: "quiz", question: "Какое ключевое английское слово встречается в названии этой темы: «quiz»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "quiz", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 3. What’s on TV? — Lesson 10. Meeting Robin Hood": [
            { difficulty: "Легко", xp: 15, answer: "hood", question: "Какое ключевое английское слово встречается в названии этой темы: «Hood»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "hood", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 3. What’s on TV? — Lesson 11. Get a medal!": [
            { difficulty: "Легко", xp: 15, answer: "medal", question: "Какое ключевое английское слово встречается в названии этой темы: «medal»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "medal", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 3. What’s on TV? — Lesson 12. Reading for pleasure: Robin Hood and the Golden Arrow": [
            { difficulty: "Легко", xp: 15, answer: "arrow", question: "Какое ключевое английское слово встречается в названии этой темы: «Arrow»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "arrow", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 4. Festivals and celebrations — Lesson 1. A British calendar": [
            { difficulty: "Легко", xp: 15, answer: "calendar", question: "Какое ключевое английское слово встречается в названии этой темы: «calendar»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "calendar", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 4. Festivals and celebrations — Lesson 2. Let’s celebrate!": [
            { difficulty: "Легко", xp: 15, answer: "celebrate", question: "Какое ключевое английское слово встречается в названии этой темы: «celebrate»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "celebrate", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 4. Festivals and celebrations — Lesson 3. Mother’s Day and Father’s Day": [
            { difficulty: "Легко", xp: 15, answer: "father's", question: "Какое ключевое английское слово встречается в названии этой темы: «Father’s»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "father's", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 4. Festivals and celebrations — Lesson 4. Special days of the planet": [
            { difficulty: "Легко", xp: 15, answer: "planet", question: "Какое ключевое английское слово встречается в названии этой темы: «planet»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "planet", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 4. Festivals and celebrations — Lesson 5. Before Christmas": [
            { difficulty: "Легко", xp: 15, answer: "christmas", question: "Какое ключевое английское слово встречается в названии этой темы: «Christmas»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "christmas", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 4. Festivals and celebrations — Lesson 6. Belarusian special days scrapbook": [
            { difficulty: "Легко", xp: 15, answer: "scrapbook", question: "Какое ключевое английское слово встречается в названии этой темы: «scrapbook»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "scrapbook", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 4. Festivals and celebrations — Lesson 7. Quiz time!": [
            { difficulty: "Легко", xp: 15, answer: "time", question: "Какое ключевое английское слово встречается в названии этой темы: «time»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "time", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 4. Festivals and celebrations — Lesson 8. Christmas fun": [
            { difficulty: "Легко", xp: 15, answer: "christmas", question: "Какое ключевое английское слово встречается в названии этой темы: «Christmas»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "christmas", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 4. Festivals and celebrations — Lesson 9. Pancake Day": [
            { difficulty: "Легко", xp: 15, answer: "pancake", question: "Какое ключевое английское слово встречается в названии этой темы: «Pancake»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "pancake", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 4. Festivals and celebrations — Lesson 10. Get a medal!": [
            { difficulty: "Легко", xp: 15, answer: "medal", question: "Какое ключевое английское слово встречается в названии этой темы: «medal»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "medal", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 4. Festivals and celebrations — Lesson 11. Let’s have a party!": [
            { difficulty: "Легко", xp: 15, answer: "party", question: "Какое ключевое английское слово встречается в названии этой темы: «party»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "party", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 4. Festivals and celebrations — Lesson 12. Reading for pleasure: The Nutcracker": [
            { difficulty: "Легко", xp: 15, answer: "nutcracker", question: "Какое ключевое английское слово встречается в названии этой темы: «Nutcracker»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "nutcracker", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 5. Be healthy! — Lesson 1. Eat-well plate": [
            { difficulty: "Легко", xp: 15, answer: "plate", question: "Какое ключевое английское слово встречается в названии этой темы: «plate»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "plate", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 5. Be healthy! — Lesson 2. An apple a day keeps the doctor away": [
            { difficulty: "Легко", xp: 15, answer: "away", question: "Какое ключевое английское слово встречается в названии этой темы: «away»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "away", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 5. Be healthy! — Lesson 3. Zucchini cake": [
            { difficulty: "Легко", xp: 15, answer: "cake", question: "Какое ключевое английское слово встречается в названии этой темы: «cake»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "cake", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 5. Be healthy! — Lesson 4. Healthy food vs junk food": [
            { difficulty: "Легко", xp: 15, answer: "food", question: "Какое ключевое английское слово встречается в названии этой темы: «food»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "food", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 5. Be healthy! — Lesson 5. My health diary": [
            { difficulty: "Легко", xp: 15, answer: "diary", question: "Какое ключевое английское слово встречается в названии этой темы: «diary»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "diary", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 5. Be healthy! — Lesson 6. Body rap": [
            { difficulty: "Легко", xp: 15, answer: "body", question: "Какое ключевое английское слово встречается в названии этой темы: «Body»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "body", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 5. Be healthy! — Lesson 7. At the doctor’s": [
            { difficulty: "Легко", xp: 15, answer: "doctor's", question: "Какое ключевое английское слово встречается в названии этой темы: «doctor’s»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "doctor's", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 5. Be healthy! — Lesson 8. Bless you!": [
            { difficulty: "Легко", xp: 15, answer: "bless", question: "Какое ключевое английское слово встречается в названии этой темы: «Bless»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "bless", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 5. Be healthy! — Lesson 9. Health experts": [
            { difficulty: "Легко", xp: 15, answer: "experts", question: "Какое ключевое английское слово встречается в названии этой темы: «experts»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "experts", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 5. Be healthy! — Lesson 10. Porridge time!": [
            { difficulty: "Легко", xp: 15, answer: "time", question: "Какое ключевое английское слово встречается в названии этой темы: «time»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "time", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 5. Be healthy! — Lesson 11. Climb the health stairs": [
            { difficulty: "Легко", xp: 15, answer: "stairs", question: "Какое ключевое английское слово встречается в названии этой темы: «stairs»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "stairs", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 6. In the city — Lesson 1. Cities and towns": [
            { difficulty: "Легко", xp: 15, answer: "towns", question: "Какое ключевое английское слово встречается в названии этой темы: «towns»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "towns", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 6. In the city — Lesson 2. In my neighbourhood": [
            { difficulty: "Легко", xp: 15, answer: "neighbourhood", question: "Какое ключевое английское слово встречается в названии этой темы: «neighbourhood»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "neighbourhood", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 6. In the city — Lesson 3. Can you tell me the way?": [
            { difficulty: "Легко", xp: 15, answer: "tell", question: "Какое ключевое английское слово встречается в названии этой темы: «tell»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "tell", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 6. In the city — Lesson 4. Travelling around the city": [
            { difficulty: "Легко", xp: 15, answer: "city", question: "Какое ключевое английское слово встречается в названии этой темы: «city»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "city", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 6. In the city — Lesson 5. Travelling around Minsk": [
            { difficulty: "Легко", xp: 15, answer: "minsk", question: "Какое ключевое английское слово встречается в названии этой темы: «Minsk»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "minsk", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 6. In the city — Lesson 6. Traffic rules": [
            { difficulty: "Легко", xp: 15, answer: "rules", question: "Какое ключевое английское слово встречается в названии этой темы: «rules»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "rules", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 6. In the city — Lesson 7. Old towns of Belarus": [
            { difficulty: "Легко", xp: 15, answer: "belarus", question: "Какое ключевое английское слово встречается в названии этой темы: «Belarus»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "belarus", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 6. In the city — Lesson 8. My favourite place": [
            { difficulty: "Легко", xp: 15, answer: "place", question: "Какое ключевое английское слово встречается в названии этой темы: «place»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "place", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 6. In the city — Lesson 9. Treasure hunt game": [
            { difficulty: "Легко", xp: 15, answer: "game", question: "Какое ключевое английское слово встречается в названии этой темы: «game»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "game", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 6. In the city — Lesson 10. Baker’s Street adventures": [
            { difficulty: "Легко", xp: 15, answer: "adventures", question: "Какое ключевое английское слово встречается в названии этой темы: «adventures»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "adventures", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 6. In the city — Lesson 11. On top of the skyscraper": [
            { difficulty: "Легко", xp: 15, answer: "skyscraper", question: "Какое ключевое английское слово встречается в названии этой темы: «skyscraper»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "skyscraper", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 7. In the country — Lesson 1. Enjoy the countryside!": [
            { difficulty: "Легко", xp: 15, answer: "countryside", question: "Какое ключевое английское слово встречается в названии этой темы: «countryside»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "countryside", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 7. In the country — Lesson 2. Visit England!": [
            { difficulty: "Легко", xp: 15, answer: "england", question: "Какое ключевое английское слово встречается в названии этой темы: «England»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "england", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 7. In the country — Lesson 3. Stay safe in the countryside": [
            { difficulty: "Легко", xp: 15, answer: "countryside", question: "Какое ключевое английское слово встречается в названии этой темы: «countryside»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "countryside", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 7. In the country — Lesson 4. Let’s go hiking!": [
            { difficulty: "Легко", xp: 15, answer: "hiking", question: "Какое ключевое английское слово встречается в названии этой темы: «hiking»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "hiking", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 7. In the country — Lesson 5. On the farm": [
            { difficulty: "Легко", xp: 15, answer: "farm", question: "Какое ключевое английское слово встречается в названии этой темы: «farm»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "farm", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 7. In the country — Lesson 6. Welcome to a world of animal magic!": [
            { difficulty: "Легко", xp: 15, answer: "magic", question: "Какое ключевое английское слово встречается в названии этой темы: «magic»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "magic", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 7. In the country — Lesson 7. Wildlife of Belarus": [
            { difficulty: "Легко", xp: 15, answer: "belarus", question: "Какое ключевое английское слово встречается в названии этой темы: «Belarus»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "belarus", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 7. In the country — Lesson 8. Belovezhskaya Pushcha": [
            { difficulty: "Легко", xp: 15, answer: "pushcha", question: "Какое ключевое английское слово встречается в названии этой темы: «Pushcha»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "pushcha", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 7. In the country — Lesson 9. A trip to the country": [
            { difficulty: "Легко", xp: 15, answer: "country", question: "Какое ключевое английское слово встречается в названии этой темы: «country»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "country", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 7. In the country — Lesson 10. Mysterious Stonehenge": [
            { difficulty: "Легко", xp: 15, answer: "stonehenge", question: "Какое ключевое английское слово встречается в названии этой темы: «Stonehenge»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "stonehenge", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 7. In the country — Lesson 11. Animals’ board game": [
            { difficulty: "Легко", xp: 15, answer: "game", question: "Какое ключевое английское слово встречается в названии этой темы: «game»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "game", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 8. Countries and continents — Lesson 1. Look at the world map": [
            { difficulty: "Легко", xp: 15, answer: "world", question: "Какое ключевое английское слово встречается в названии этой темы: «world»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "world", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 8. Countries and continents — Lesson 2. Hot and cold, dry and wet": [
            { difficulty: "Легко", xp: 15, answer: "cold", question: "Какое ключевое английское слово встречается в названии этой темы: «cold»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "cold", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 8. Countries and continents — Lesson 3. Running fast and walking slowly": [
            { difficulty: "Легко", xp: 15, answer: "slowly", question: "Какое ключевое английское слово встречается в названии этой темы: «slowly»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "slowly", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 8. Countries and continents — Lesson 4. Rules all over the world": [
            { difficulty: "Легко", xp: 15, answer: "world", question: "Какое ключевое английское слово встречается в названии этой темы: «world»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "world", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 8. Countries and continents — Lesson 5. East or west — home is best": [
            { difficulty: "Легко", xp: 15, answer: "best", question: "Какое ключевое английское слово встречается в названии этой темы: «best»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "best", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 8. Countries and continents — Lesson 6. The world celebrates": [
            { difficulty: "Легко", xp: 15, answer: "celebrates", question: "Какое ключевое английское слово встречается в названии этой темы: «celebrates»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "celebrates", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 8. Countries and continents — Lesson 7. It’s a small world": [
            { difficulty: "Легко", xp: 15, answer: "world", question: "Какое ключевое английское слово встречается в названии этой темы: «world»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "world", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 8. Countries and continents — Lesson 8. Geography chant": [
            { difficulty: "Легко", xp: 15, answer: "chant", question: "Какое ключевое английское слово встречается в названии этой темы: «chant»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "chant", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 8. Countries and continents — Lesson 9. My place in the world": [
            { difficulty: "Легко", xp: 15, answer: "world", question: "Какое ключевое английское слово встречается в названии этой темы: «world»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "world", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 8. Countries and continents — Lesson 10. Alphabet quest for countries and continents": [
            { difficulty: "Легко", xp: 15, answer: "continents", question: "Какое ключевое английское слово встречается в названии этой темы: «continents»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "continents", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 8. Countries and continents — Lesson 11. Why do birds fly south?": [
            { difficulty: "Легко", xp: 15, answer: "south", question: "Какое ключевое английское слово встречается в названии этой темы: «south»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "south", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 9. Travelling — Lesson 1. Travel far and wide": [
            { difficulty: "Легко", xp: 15, answer: "wide", question: "Какое ключевое английское слово встречается в названии этой темы: «wide»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "wide", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 9. Travelling — Lesson 2. What is your favourite way of travelling?": [
            { difficulty: "Легко", xp: 15, answer: "travelling", question: "Какое ключевое английское слово встречается в названии этой темы: «travelling»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "travelling", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 9. Travelling — Lesson 3. A fortune-teller": [
            { difficulty: "Легко", xp: 15, answer: "fortune-teller", question: "Какое ключевое английское слово встречается в названии этой темы: «fortune-teller»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "fortune-teller", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 9. Travelling — Lesson 4. Let’s choose the route for our journey!": [
            { difficulty: "Легко", xp: 15, answer: "journey", question: "Какое ключевое английское слово встречается в названии этой темы: «journey»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "journey", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 9. Travelling — Lesson 5. Invite your friend to Belarus": [
            { difficulty: "Легко", xp: 15, answer: "belarus", question: "Какое ключевое английское слово встречается в названии этой темы: «Belarus»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "belarus", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 9. Travelling — Lesson 6. Safety tips and rules": [
            { difficulty: "Легко", xp: 15, answer: "rules", question: "Какое ключевое английское слово встречается в названии этой темы: «rules»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "rules", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 9. Travelling — Lesson 7. A traveller’s diary": [
            { difficulty: "Легко", xp: 15, answer: "diary", question: "Какое ключевое английское слово встречается в названии этой темы: «diary»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "diary", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 9. Travelling — Lesson 8. Interview about an adventurous journey": [
            { difficulty: "Легко", xp: 15, answer: "journey", question: "Какое ключевое английское слово встречается в названии этой темы: «journey»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "journey", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 9. Travelling — Lesson 9. It can’t be true!": [
            { difficulty: "Легко", xp: 15, answer: "true", question: "Какое ключевое английское слово встречается в названии этой темы: «true»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "true", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 9. Travelling — Lesson 10. My dream journey in photos": [
            { difficulty: "Легко", xp: 15, answer: "photos", question: "Какое ключевое английское слово встречается в названии этой темы: «photos»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "photos", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],
        "Unit 9. Travelling — Lesson 11. Following in Charles Darwin’s footsteps": [
            { difficulty: "Легко", xp: 15, answer: "footsteps", question: "Какое ключевое английское слово встречается в названии этой темы: «footsteps»? Напишите слово по-английски." },
            { difficulty: "Средне", xp: 25, answer: "footsteps", question: "Заполните пропуск словом из названия темы: The lesson is about ___ ." }
        ],    },
    "ФИЗИКА": {},
    "ХИМИЯ": {},
    "БИОЛОГИЯ": {},
    "ИСТОРИЯ": {
        "Часть 1 — § 1. Мир древней истории": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "жизнь людей в прошлом",
                        "question": "Что изучает история?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Древний мир",
                        "question": "Как называется древнейший большой период истории человечества в учебном пособии?"
                }
        ],
        "Часть 1 — § 2. Счет лет в истории": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "хронология",
                        "question": "Как называется последовательность исторических событий во времени?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "100",
                        "question": "Сколько лет составляет один век?"
                }
        ],
        "Часть 1 — § 3. Древнейшие люди": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "человек умелый",
                        "question": "Как назывался древний человек, рядом с костями которого найдены первые каменные орудия?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "охота",
                        "question": "Каким было одно из основных занятий древнейших людей: земледелие или охота?"
                }
        ],
        "Часть 1 — § 4. Первые шаги человека современного вида": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "кроманьонец",
                        "question": "Как называли человека современного вида, останки которого появились в Европе более 40 тысяч лет назад?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "камень",
                        "question": "Какой материал древние люди использовали для изготовления многих орудий?"
                }
        ],
        "Часть 1 — § 5. Возникновение искусства и религии": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "пещеры",
                        "question": "Где древние люди оставляли многие изображения животных и сцен своей жизни?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "с попытками объяснить окружающий мир",
                        "question": "С чем связано возникновение религиозных представлений древних людей?"
                }
        ],
        "Часть 1 — § 6. Появление земледелия и животноводства": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "земледелие",
                        "question": "Какое занятие возникло у людей в период перехода к производящему хозяйству?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "домашних",
                        "question": "Каких животных люди начали разводить вместо того, чтобы только добывать их в природе?"
                }
        ],
        "Часть 1 — § 7. Переход от родовой общины к соседской": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "соседская община",
                        "question": "Как называется община, в которой вместе жили и хозяйствовали соседние семьи?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "появление излишков",
                        "question": "Что стало одной из причин имущественного неравенства?"
                }
        ],
        "Часть 1 — § 8. На пути к цивилизации": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "города государство письменность",
                        "question": "Какие три признака в учебном пособии названы важными для цивилизации?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "города и государства",
                        "question": "Что возникло раньше: города и государства или письменность? В учебном пособии они рассматриваются как признаки перехода к цивилизации."
                }
        ],
        "Часть 1 — § 9. Природа и население Древнего Египта": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Нил",
                        "question": "Какая река была основой жизни Древнего Египта?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "северо-восточная Африка",
                        "question": "В какой части Африки находился Древний Египет?"
                }
        ],
        "Часть 1 — § 10. Государство фараонов": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "фараон",
                        "question": "Как назывался правитель Древнего Египта?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "3000",
                        "question": "Около какого года до н. э. произошло объединение Верхнего и Нижнего Египта?"
                }
        ],
        "Часть 1 — § 11. Превращение Древнего Египта в могущественную державу": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Тутмос III",
                        "question": "Какой фараон правил в XV веке до н. э. и известен завоеваниями?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "II",
                        "question": "В каком тысячелетии до н. э. Египет достигал могущества как крупная держава?"
                }
        ],
        "Часть 1 — § 12. Быт и повседневная жизнь древних египтян": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "папирус",
                        "question": "На каком растении египтяне изготавливали материал для письма?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "природные материалы",
                        "question": "Что использовали египтяне для строительства, изготовления предметов и ведения хозяйства?"
                }
        ],
        "Часть 1 — § 13. Религия древних египтян": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Ра",
                        "question": "Как называли главного солнечного бога в египетской религии?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "мумификация",
                        "question": "Как называется сохранение тела умершего с помощью специальной обработки?"
                }
        ],
        "Часть 1 — § 14. Культура древних египтян": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "иероглифы",
                        "question": "Как называется древнеегипетское письмо знаками-рисунками?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "пирамиды",
                        "question": "Какие знаменитые сооружения строили египтяне как гробницы фараонов?"
                }
        ],
        "Часть 1 — § 15. Древнее Междуречье": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Тигр и Евфрат",
                        "question": "Между какими двумя реками возникли древние государства Междуречья?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "клинопись",
                        "question": "Как называлась древняя письменность Междуречья клинообразными знаками?"
                }
        ],
        "Часть 1 — § 16. Становление государства в Месопотамии": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "города-государства",
                        "question": "Как назывались самостоятельные города-государства древнего Междуречья?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Шумер",
                        "question": "Какая древняя область в Южной Месопотамии стала одним из центров первых государств?"
                }
        ],
        "Часть 1 — § 17. Государство Хаммурапи": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Вавилон",
                        "question": "Столицей какого государства был Вавилон при Хаммурапи?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "законы Хаммурапи",
                        "question": "Как называется знаменитый сборник законов царя Хаммурапи?"
                }
        ],
        "Часть 1 — § 18. Ассирия и Вавилония": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Ниневия",
                        "question": "Какой город был столицей Ассирийского государства?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Навуходоносор",
                        "question": "Как звали правителя Вавилона, правившего в 605–562 годах до н. э.?"
                }
        ],
        "Часть 1 — § 19. Культура и религия народов Междуречья": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "клинопись",
                        "question": "Как называлась письменность народов Междуречья?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "зиккураты",
                        "question": "Как назывались ступенчатые храмовые сооружения в Междуречье?"
                }
        ],
        "Часть 1 — § 20. Хеттская держава": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Малая Азия",
                        "question": "На территории какого полуострова возникло Хеттское царство?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "железо",
                        "question": "Какой металл хетты широко использовали для изготовления оружия?"
                }
        ],
        "Часть 1 — § 21. Древний Иран": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Персия",
                        "question": "Как называлось государство, возникшее на территории Древнего Ирана и ставшее крупной державой?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Дарий I",
                        "question": "Как звали персидского царя, правившего в 522–486 годах до н. э.?"
                }
        ],
        "Часть 1 — § 22. Древняя Финикия": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "мореплаванием",
                        "question": "Чем особенно прославились финикийцы в Средиземноморье?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "алфавит",
                        "question": "Какое важное достижение финикийцев связано с развитием письменности?"
                }
        ],
        "Часть 1 — § 23. Древняя Палестина": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Давид",
                        "question": "Как звали царя Израиля, правившего в 1005–965 годах до н. э.?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Соломон",
                        "question": "Как звали царя, правившего в 965–926 годах до н. э.?"
                }
        ],
        "Часть 1 — § 24. Древняя Индия": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Инд и Ганг",
                        "question": "Какие две крупные реки особенно важны для древней истории Индии?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "варны",
                        "question": "Как назывались большие группы населения древнеиндийского общества, связанные с происхождением и занятиями?"
                }
        ],
        "Часть 1 — § 25. Культура Древней Индии": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "буддизм",
                        "question": "Какая религия возникла в Древней Индии и связана с учением Будды?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "карма",
                        "question": "Как называлось учение о перерождении и последствиях поступков человека?"
                }
        ],
        "Часть 1 — § 26. Возникновение государства в Китае": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Цинь",
                        "question": "Какая династия создала первую древнюю империю Китая в III веке до н. э.?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Цинь Шихуанди",
                        "question": "Как звали правителя, при котором в 221 году до н. э. была образована империя Цинь?"
                }
        ],
        "Часть 1 — § 27. Общество и культура Древнего Китая": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Конфуций",
                        "question": "Как звали древнекитайского мыслителя, жившего в 551–479 годах до н. э.?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Великая Китайская стена",
                        "question": "Какое крупное сооружение начали строить при Цинь Шихуанди для защиты северных границ?"
                }
        ],
        "Часть 1 — § 28. Древнейшее население Америки": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "из Азии",
                        "question": "Откуда, согласно распространённой в учебной традиции версии, древнейшие люди проникли в Америку?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Америка",
                        "question": "На какой части света сформировались древнейшие цивилизации Америки?"
                }
        ],
        "Часть 1 — § 29. Цивилизация ольмеков": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Мезоамерика",
                        "question": "На территории какого региона существовала цивилизация ольмеков?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "каменными головами",
                        "question": "Чем особенно известны ольмеки в археологии?"
                }
        ],
        "Часть 2 — § 1. Природа и население Древней Греции": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Балканский полуостров",
                        "question": "На каком полуострове жили древние греки?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Эллада",
                        "question": "Как древние греки называли свою родину?"
                }
        ],
        "Часть 2 — § 2. Минойский Крит и его культура": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Крит",
                        "question": "На каком острове возникли первые государства в Греции?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Кносский дворец",
                        "question": "Как назывался знаменитый дворец на Крите, раскопанный археологами?"
                }
        ],
        "Часть 2 — § 3. Ахейская Греция": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Микенская цивилизация",
                        "question": "Как называлась первая цивилизация на территории материковой Греции?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Микены",
                        "question": "Какой город дал название этой цивилизации?"
                }
        ],
        "Часть 2 — § 4. Возникновение греческого полиса": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "полис",
                        "question": "Как назывался город-государство в Древней Греции?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "акрополь",
                        "question": "Как называлась укреплённая возвышенная часть греческого города?"
                }
        ],
        "Часть 2 — § 5. Великая греческая колонизация": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "по берегам Средиземного и Черного морей",
                        "question": "В каком направлении греки основывали многочисленные колонии за пределами Балкан?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "метрополия",
                        "question": "Как назывался город, из которого переселенцы основывали колонию?"
                }
        ],
        "Часть 2 — § 6. Древняя Спарта": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Пелопоннес",
                        "question": "В какой части Греции находилась Спарта?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "илоты",
                        "question": "Как называли зависимое население Спарты, обрабатывавшее землю?"
                }
        ],
        "Часть 2 — § 7. Возникновение и развитие Афинского государства": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Афины",
                        "question": "Как назывался главный город области Аттика?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Солон",
                        "question": "Как звали афинского законодателя, с реформами которого связано развитие Афинского государства?"
                }
        ],
        "Часть 2 — § 8. Греко-персидские войны и расцвет Афин": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "греко-персидские войны",
                        "question": "Как назывались войны между греческими полисами и Персидской державой?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Саламинская битва",
                        "question": "В каком знаменитом морском сражении греки одержали победу над персами в 480 году до н. э.?"
                }
        ],
        "Часть 2 — § 9. Пелопоннесская война и упадок Афин": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Пелопоннесский союз",
                        "question": "Какой союз возглавляла Спарта в борьбе против Афин?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Афины и Спарта",
                        "question": "Между какими двумя ведущими полисами шла Пелопоннесская война?"
                }
        ],
        "Часть 2 — § 10. Держава Александра Македонского": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Александр Македонский",
                        "question": "Как звали македонского царя, создавшего огромную державу в IV веке до н. э.?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Александрия",
                        "question": "Как назывался город в Египте, основанный Александром Македонским и ставший крупным культурным центром?"
                }
        ],
        "Часть 2 — § 11. Религия древних греков": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Олимп",
                        "question": "Как называлась главная гора богов в древнегреческих мифах?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Зевс",
                        "question": "Кого древние греки считали верховным богом?"
                }
        ],
        "Часть 2 — § 12. Древнегреческая школа и научные знания": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "школа",
                        "question": "Как называлось место, где в Древней Греции проходило обучение детей?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Евклид",
                        "question": "Какой древнегреческий учёный известен трудами по геометрии?"
                }
        ],
        "Часть 2 — § 13. Древнегреческое искусство": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "мрамор",
                        "question": "Из какого материала древнегреческие скульпторы часто создавали статуи?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Парфенон",
                        "question": "Как назывался знаменитый храм на афинском Акрополе?"
                }
        ],
        "Часть 2 — § 14. Древнегреческий театр и Олимпийские игры": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Дионис",
                        "question": "В честь какого бога возникли древнегреческие театральные представления?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Олимпия",
                        "question": "Где проходили древние Олимпийские игры?"
                }
        ],
        "Часть 2 — § 15. Повседневная жизнь древних греков": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "агора",
                        "question": "Как называлась рыночная площадь в древнегреческом полисе?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "оливковое масло",
                        "question": "Какой продукт получали из оливковых деревьев и широко использовали греки?"
                }
        ],
        "Часть 2 — § 16. Эллинистическая культура": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "эллинизм",
                        "question": "Как называется период распространения греческой культуры на Востоке после завоеваний Александра?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Александрия",
                        "question": "Какой город стал одним из главных центров эллинистической культуры?"
                }
        ],
        "Часть 2 — § 17. Легендарное начало Рима": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Тибр",
                        "question": "На какой реке возник древний Рим?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Ромул",
                        "question": "Кто, согласно легенде, основал Рим вместе со своим братом Ремом?"
                }
        ],
        "Часть 2 — § 18. Ранняя Римская республика": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "республика",
                        "question": "Как назывался государственный строй Рима после изгнания царя?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "консулы",
                        "question": "Как назывались два высших ежегодно избираемых должностных лица Римской республики?"
                }
        ],
        "Часть 2 — § 19. Завоевание Римом Италии": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "народы Италии",
                        "question": "Какой народ Рим постепенно подчинил в ходе завоевания Апеннинского полуострова?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Апеннинский полуостров",
                        "question": "На каком полуострове располагался Рим?"
                }
        ],
        "Часть 2 — § 20. Завоевание Римом Средиземноморья": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Карфаген",
                        "question": "С каким государством Рим вёл Пунические войны?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Ганнибал",
                        "question": "Как звали знаменитого карфагенского полководца, перешедшего через Альпы?"
                }
        ],
        "Часть 2 — § 21. Земельная и военная реформы в Риме": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Гракхи",
                        "question": "Как назывались братья, связанные с земельными реформами в Риме?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "профессиональная армия",
                        "question": "Какое изменение в армии было связано с реформами Мария?"
                }
        ],
        "Часть 2 — § 22. Рабовладение в Риме": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "гладиаторы",
                        "question": "Как называли бойцов, сражавшихся на аренах Древнего Рима?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "восстание Спартака",
                        "question": "Как называлось крупнейшее восстание рабов под руководством Спартака?"
                }
        ],
        "Часть 2 — § 23. Падение Римской республики и создание империи": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Юлий Цезарь",
                        "question": "Кто перешёл через Рубикон и стал одним из главных участников конца республики?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Октавиан Август",
                        "question": "Как звали первого римского императора?"
                }
        ],
        "Часть 2 — § 24. Власть римских императоров": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "император",
                        "question": "Как назывался титул римского правителя?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "сенат",
                        "question": "Какой орган власти сохранялся в Римской империи, хотя его роль изменилась?"
                }
        ],
        "Часть 2 — § 25. Рим — столица империи": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "форум",
                        "question": "Как называлась главная площадь древнего Рима?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Колизей",
                        "question": "Какое сооружение использовали для гладиаторских боёв?"
                }
        ],
        "Часть 2 — § 26. Культура Древнего Рима": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Колизей",
                        "question": "Как назывался знаменитый римский амфитеатр?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "латинский",
                        "question": "Какой язык оказал огромное влияние на культуру и право Древнего Рима?"
                }
        ],
        "Часть 2 — § 27. Религия древних римлян": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Юпитер",
                        "question": "Как назывался главный бог римского пантеона?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Веста",
                        "question": "Как называли богиню, которую римляне связывали с домашним очагом?"
                }
        ],
        "Часть 2 — § 28. Христианство в Римской империи": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Палестина",
                        "question": "В какой стране Восточного Средиземноморья возникло христианство?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "христиане",
                        "question": "Как называли последователей нового учения?"
                }
        ],
        "Часть 2 — § 29. Падение Западной Римской империи": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "476",
                        "question": "В каком году традиционно датируют падение Западной Римской империи?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "Одоакр",
                        "question": "Кто в 476 году сместил последнего западноримского императора Ромула Августула?"
                }
        ],
        "Часть 2 — § 30. Древние германцы": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "к северу от Римской империи",
                        "question": "Где жили древние германцы по отношению к Римской империи?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "народное собрание",
                        "question": "Как называлось объединение свободных мужчин у древних германцев, участвовавшее в принятии решений?"
                }
        ],
        "Часть 2 — § 31. Древние славяне": [
                {
                        "difficulty": "Легко",
                        "xp": 15,
                        "answer": "Центральная и Восточная Европа",
                        "question": "Где расселялись древние славяне?"
                },
                {
                        "difficulty": "Средне",
                        "xp": 25,
                        "answer": "земледелие и ремесло",
                        "question": "Какие занятия были характерны для древних славян?"
                }
        ]
},
    "БЕЛАРУСКАЯ МОВА": {},
    "БЕЛАРУСКАЯ ЛІТАРАТУРА": {},
    "ГЕОГРАФИЯ": {}
};

// ---------- ОБНОВЛЕНИЕ ПРОГРЕССА ----------

function updateProgress() {
    const xpText       = document.querySelector("#xpText");
    const progressBars = document.querySelectorAll(".profile .progress-fill, #progressBig");
    const levelNumber  = document.querySelector("#levelNumber");

    xpText.textContent = xp + " / " + maxXp + " XP";

    const percent = (xp / maxXp) * 100;

    progressBars.forEach(function (bar) {
        bar.style.width = percent + "%";
    });

    levelNumber.textContent = level;
}

function updateSubjectCards() {
    const cardsContainer = document.querySelector("#subjectCards");
    const noSubjectsMessage = document.querySelector("#noSubjectsMessage");
    const studentClass = classSelect.value;
    const availableSubjects = getSubjectsForClass(studentClass);

    cardsContainer.innerHTML = "";

    if (availableSubjects.length === 0) {
        noSubjectsMessage.style.display = "block";
        return;
    }

    noSubjectsMessage.style.display = "none";

    availableSubjects.forEach(function (subject) {
        const card = document.createElement("div");
        card.className = "card subject-card";

        const span = document.createElement("span");
        span.textContent = subjectLabels[subject] || subject;

        const h3 = document.createElement("h3");
        h3.textContent = "Lv. 0";

        const progressBar = document.createElement("div");
        progressBar.className = "progress-bar";

        const progressFill = document.createElement("div");
        progressFill.className = "progress-fill";

        progressBar.appendChild(progressFill);
        card.appendChild(span);
        card.appendChild(h3);
        card.appendChild(progressBar);
        cardsContainer.appendChild(card);
    });

    updateSubjects();
}

function updateSubjects() {
    const subjectCards = document.querySelectorAll(".subject-card");
    subjectCards.forEach(function (card) {
        const subjectName = card.querySelector("span").textContent;
        if (!subjects[subjectName]) return;

        const subjectData = subjects[subjectName];
        card.querySelector("h3").textContent = "Lv. " + subjectData.level;

        const progressBar = card.querySelector(".progress-fill");
        const percent = (subjectData.xp / subjectMaxXp) * 100;
        progressBar.style.width = percent + "%";
    });
}

function updateTopics() {
    const subject = subjectSelect.value;
    const studentClass = classSelect.value;

    topicSelect.innerHTML = "";

    if (!subject || !getSubjectsForClass(studentClass).includes(subject)) {
        topicSelect.disabled = true;
        selectedSubject.textContent = "—";
        selectedTopic.textContent = "—";
        taskDescription.textContent = "Для выбранного класса предметы пока не добавлены.";
        taskArea.style.display = "none";
        startTaskButton.disabled = true;
        startTaskButton.style.display = "inline-block";
        return;
    }

    topicSelect.disabled = false;
    startTaskButton.disabled = false;

    let topicList;

    if (subject === "МАТЕМАТИКА" && topicsByClass[studentClass]) {
        topicList = topicsByClass[studentClass];
    } else if (topics[subject]) {
        topicList = topics[subject];
    } else {
        topicList = ["Общие темы"];
    }

    topicList.forEach(function (t) {
        const option = document.createElement("option");
        option.textContent = t;
        option.value = t;
        topicSelect.appendChild(option);
    });

    updateTaskPreview();
}


// ---------- АВТОМАТИЧЕСКИЕ ЗАДАНИЯ ИЗ ТЕМ УЧЕБНИКА ----------
function normalizeAnswer(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[«»“”„”]/g, '"')
        .replace(/[’`]/g, "'")
        .replace(/[—–−]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[.!?,;:]+$/g, "");
}

function textbookSectionForBelMova(topic) {
    const t = topic.toLowerCase();
    if (/^тэкст|прыметы тэксту|план тэксту/.test(t)) return "Тэкст";
    if (/(мова|маўленне|стылі маўлення|пераказ)/.test(t)) return "Маўленне";
    if (/(словазлучэнне|сказ|члены сказа|зваротк|складаныя|простая мова|дыялог|пунктуац)/.test(t)) return "Сінтаксіс і пунктуацыя";
    if (/(гукі|літара|склад|націск|галосн|зычн|алфавіт|перанос|апостраф|правапіс у, ў)/.test(t)) return "Фанетыка і арфаэпія. Графіка і арфаграфія";
    if (/(лексіч|словы|сінонім|антонім|амонім|фразеалагізм|неалагізм|запазычан)/.test(t)) return "Лексіка. Фразеалогія";
    if (/(назоўнік|прыметнік|займеннік|дзеяслоў|часціны мовы)/.test(t)) return "Марфалогія";
    if (/(склад слова|словаўтвар)/.test(t)) return "Склад слова. Словаўтварэнне";
    return "Беларуская мова";
}

function buildTextbookTasks(subject, topic) {
    if (!topic) return [];
    const tasks = [];
    const authorPart = topic.includes(".") ? topic.split(".")[0].trim() : "";

    if (subject === "БЕЛАРУСКАЯ ЛІТАРАТУРА") {
        tasks.push({
            difficulty: "Легко", xp: 15,
            answer: topic,
            question: "Як называецца тэма/твор, які пазначаны ў падручніку? Увядзі назву: «" + topic + "»."
        });
        tasks.push({
            difficulty: "Средне", xp: 25,
            answer: authorPart || topic,
            question: authorPart
                ? "Хто пазначаны аўтарам у назве гэтай тэмы? Увядзі: «" + authorPart + "»."
                : "Увядзі назву тэмы дакладна так, як яна пададзена ў падручніку."
        });
        return tasks;
    }

    if (subject === "БЕЛАРУСКАЯ МОВА") {
        const section = textbookSectionForBelMova(topic);
        tasks.push({
            difficulty: "Легко", xp: 15,
            answer: topic,
            question: "Як называецца гэтая тэма ў падручніку? Увядзі: «" + topic + "»."
        });
        tasks.push({
            difficulty: "Средне", xp: 25,
            answer: section,
            question: "Да якога раздзела падручніка адносіцца тэма «" + topic + "»? Увядзі назву раздзела."
        });
        return tasks;
    }

    if (subject === "РУССКИЙ ЯЗЫК") {
        tasks.push({ difficulty: "Легко", xp: 15, answer: topic, question: "Как называется выбранная тема в учебнике? Введите название темы." });
        tasks.push({ difficulty: "Средне", xp: 25, answer: topic, question: "Повторите название темы точно так, как оно указано в списке учебника." });
        return tasks;
    }

    if (subject === "АНГЛИЙСКИЙ ЯЗЫК") {
        const unit = (topic.match(/^Unit\s+\d+/i) || [""])[0];
        tasks.push({ difficulty: "Легко", xp: 15, answer: topic, question: "Как называется выбранный урок? Введите его название точно по учебнику." });
        tasks.push({ difficulty: "Средне", xp: 25, answer: unit || topic, question: unit ? "К какому юниту относится этот урок? Введите, например: Unit 1." : "Введите название урока точно по учебнику." });
        return tasks;
    }

    // Универсальный резерв: тема всегда существует в учебной программе.
    tasks.push({ difficulty: "Легко", xp: 15, answer: topic, question: "Как называется выбранная тема? Введите название точно из списка тем." });
    tasks.push({ difficulty: "Средне", xp: 25, answer: topic, question: "Повторите название выбранной темы по учебнику." });
    return tasks;
}

function updateTaskPreview() {
    selectedSubject.textContent = subjectSelect.value;
    selectedTopic.textContent   = topicSelect.value;
    taskDescription.textContent = "После выбора темы нажмите «Начать задание».";
    taskArea.style.display      = "none";
    startTaskButton.style.display = "inline-block";
    answerResult.textContent    = "";
}

// ---------- СОБЫТИЯ ----------

subjectSelect.addEventListener("change", updateTopics);
topicSelect.addEventListener("change", updateTaskPreview);

startTaskButton.addEventListener("click", function () {
    const subject = subjectSelect.value;
    const studentClass = classSelect.value;
    const topic = topicSelect.value;

    let taskList = null;

    if (
        subject === "МАТЕМАТИКА" &&
        studentClass === "5" &&
        tasks5Class[topic]
    ) {
        taskList = tasks5Class[topic];
    } else if (tasks[subject] && tasks[subject][topic]) {
        taskList = tasks[subject][topic];
    }

    // Если в массиве нет готовых заданий, строим простые задания прямо из
    // темы учебника. Это особенно важно для белорусской мовы/літаратуры:
    // тема и автор берутся из списка тем, составленного по учебникам.
    if (!taskList || taskList.length === 0) {
        taskList = buildTextbookTasks(subject, topic);
    }

    if (!taskList || taskList.length === 0) {
        taskDescription.textContent = "Для этой темы пока нет заданий.";
        taskArea.style.display = "none";
        startTaskButton.style.display = "inline-block";
        return;
    }

    const taskCandidates = taskList.filter(function (task) {
        const taskId = studentClass + "|" + subject + "|" + topic + "|" + task.question;
        return !completedTasks.has(taskId);
    });

    if (taskCandidates.length === 0) {
        taskDescription.textContent = "В этой теме ты уже выполнил все доступные задания.";
        taskArea.style.display = "none";
        startTaskButton.style.display = "inline-block";
        return;
    }

    currentTask = taskCandidates[Math.floor(Math.random() * taskCandidates.length)];

    taskDescription.innerHTML =
        "<strong>" + currentTask.difficulty + "</strong><br><br>" + currentTask.question;

    taskArea.style.display        = "block";
    startTaskButton.style.display = "none";
    answerInput.value             = "";
    answerResult.textContent      = "";
    checkAnswerButton.disabled    = false;
    answerInput.focus();
});

checkAnswerButton.addEventListener("click", function () {
    if (!currentTask) return;

    const userAnswer = normalizeAnswer(answerInput.value);
    const accepted = Array.isArray(currentTask.acceptedAnswers)
        ? currentTask.acceptedAnswers
        : [currentTask.answer];
    const isCorrect = accepted.some(function (answer) {
        return normalizeAnswer(answer) === userAnswer;
    });

    if (isCorrect) {

        const gainXp = Number(currentTask.xp) || 0;
        const subject = subjectSelect.value;
        const studentClass = classSelect.value;
        const topic = topicSelect.value;
        const taskId = studentClass + "|" + subject + "|" + topic + "|" + currentTask.question;

        // За одно и то же задание XP можно получить только один раз.
        if (completedTasks.has(taskId)) {
            answerResult.textContent = "Это задание уже засчитано.";
            checkAnswerButton.disabled = true;
            return;
        }

        // Общий XP. Уровень теперь НЕ хранится как независимое число —
        // он всегда вычисляется из накопленного XP.
        const oldLevel = level;
        totalXp += gainXp;
        level = Math.floor(totalXp / maxXp);
        xp = totalXp % maxXp;

        if (level > oldLevel) {
            alert("Новый уровень! Теперь ты " + level + " уровня!");
        }

        // XP конкретного предмета.
        if (subjects[subject]) {
            const oldSubjectLevel = subjects[subject].level || 0;

            subjects[subject].totalXp =
                (Number(subjects[subject].totalXp) || 0) + gainXp;
            subjects[subject].level =
                Math.floor(subjects[subject].totalXp / subjectMaxXp);
            subjects[subject].xp =
                subjects[subject].totalXp % subjectMaxXp;

            if (subjects[subject].level > oldSubjectLevel) {
                alert(subject + " прокачан до Lv. " + subjects[subject].level + "!");
            }
        }

        completedTasks.add(taskId);

        saveUserData();
        updateProgress();
        updateSubjects();

        answerResult.textContent = "Правильно! +" + gainXp + " XP";
        checkAnswerButton.disabled = true;

    } else {
        answerResult.textContent = "Неправильно. Попробуй ещё раз!";
    }
});

function goToLearning(subject) {
    subjectSelect.value = subject;
    updateTopics();
    document.querySelector("#learning").scrollIntoView({ behavior: "smooth" });
}

// ---------- АУТЕНТИФИКАЦИЯ ----------

const accountButton      = document.querySelector("#accountButton");
const accountButtonText  = document.querySelector("#accountButtonText");
const accountPanel       = document.querySelector("#accountPanel");
const showLoginButton    = document.querySelector("#showLogin");
const showRegisterButton = document.querySelector("#showRegister");
const loginForm          = document.querySelector("#loginForm");
const registerForm       = document.querySelector("#registerForm");
const authForms          = document.querySelector("#authForms");
const userProfile        = document.querySelector("#userProfile");
const userNameElement    = document.querySelector("#userName");
const authMessage        = document.querySelector("#authMessage");
const logoutButton       = document.querySelector("#logoutButton");
const continueGuest      = document.querySelector("#continueGuest");

accountButton.addEventListener("click", function (event) {
    event.stopPropagation();
    accountPanel.classList.toggle("open");
});

document.addEventListener("click", function (event) {
    if (!accountPanel.contains(event.target) && event.target !== accountButton) {
        accountPanel.classList.remove("open");
    }
});

accountPanel.addEventListener("click", function (event) {
    event.stopPropagation();
});

showLoginButton.addEventListener("click", function () {
    loginForm.style.display    = "flex";
    registerForm.style.display = "none";
    showLoginButton.classList.add("active");
    showRegisterButton.classList.remove("active");
    authMessage.textContent = "";
});

showRegisterButton.addEventListener("click", function () {
    loginForm.style.display    = "none";
    registerForm.style.display = "flex";
    showRegisterButton.classList.add("active");
    showLoginButton.classList.remove("active");
    authMessage.textContent = "";
});

registerForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const name     = document.querySelector("#registerName").value.trim();
    const password = document.querySelector("#registerPassword").value;
    const remember = document.querySelector("#rememberRegister").checked;

    if (name.length < 2) {
        authMessage.textContent = "Имя должно содержать минимум 2 символа.";
        return;
    }
    if (password.length < 4) {
        authMessage.textContent = "Пароль должен содержать минимум 4 символа.";
        return;
    }
    if (localStorage.getItem("eduLevelUser_" + name)) {
        authMessage.textContent = "Такое имя уже занято.";
        return;
    }

    localStorage.setItem(
        "eduLevelUser_" + name,
        JSON.stringify({ name: name, password: password })
    );

    loginUser(name, remember);
    authMessage.textContent = "Аккаунт создан!";
    registerForm.reset();
});

loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const name     = document.querySelector("#loginName").value.trim();
    const password = document.querySelector("#loginPassword").value;
    const remember = document.querySelector("#rememberLogin").checked;

    const savedUser = JSON.parse(localStorage.getItem("eduLevelUser_" + name));

    if (savedUser && savedUser.name === name && savedUser.password === password) {
        loginUser(name, remember);
        authMessage.textContent = "Вход выполнен!";
        loginForm.reset();
    } else {
        authMessage.textContent = "Неверное имя или пароль.";
    }
});

logoutButton.addEventListener("click", function () {
    logoutUser();
});

continueGuest.addEventListener("click", function () {
    accountPanel.classList.remove("open");
    authMessage.textContent = "";
});

function loginUser(name, remember) {
    currentUser = name;
    userKey = name;

    if (remember) {
        localStorage.setItem("eduLevelCurrentUser", name);
        sessionStorage.removeItem("eduLevelCurrentUser");
    } else {
        sessionStorage.setItem("eduLevelCurrentUser", name);
        localStorage.removeItem("eduLevelCurrentUser");
    }

    loadUserData();
    updateAuthInterface();
    updateProgress();
    updateSubjects();

    setTimeout(function () {
        accountPanel.classList.remove("open");
    }, 700);
}

function logoutUser() {
    currentUser = null;
    userKey = "guest";

    localStorage.removeItem("eduLevelCurrentUser");
    sessionStorage.removeItem("eduLevelCurrentUser");

    loadUserData();
    updateAuthInterface();
    updateProgress();
    updateSubjects();
}

function updateAuthInterface() {
    if (currentUser) {
        accountButtonText.textContent = "Пользователь: " + currentUser;
        accountButton.classList.add("logged-in");
        authForms.style.display   = "none";
        userProfile.style.display = "block";
        userNameElement.textContent = currentUser;
    } else {
        accountButtonText.textContent = "Войти";
        accountButton.classList.remove("logged-in");
        authForms.style.display   = "block";
        userProfile.style.display = "none";
        loginForm.style.display    = "flex";
        registerForm.style.display = "none";
        showLoginButton.classList.add("active");
        showRegisterButton.classList.remove("active");
        authMessage.textContent = "";
    }
}

function checkAutoLogin() {
    let savedUser = localStorage.getItem("eduLevelCurrentUser");
    if (!savedUser) {
        savedUser = sessionStorage.getItem("eduLevelCurrentUser");
    }
    if (savedUser) {
        const userData = localStorage.getItem("eduLevelUser_" + savedUser);
        if (userData) {
            currentUser = savedUser;
            userKey     = savedUser;
        } else {
            localStorage.removeItem("eduLevelCurrentUser");
            sessionStorage.removeItem("eduLevelCurrentUser");
        }
    }
    loadUserData();
    updateAuthInterface();
}

// ---------- ЗАПУСК ----------

checkAutoLogin();
updateSubjectOptions();
updateSubjectCards();

/* Светлая / тёмная тема */
(function(){
  const themeButton = document.getElementById("themeToggle");
  if (!themeButton) return;

  const savedTheme = localStorage.getItem("eduLevelTheme");
  if (savedTheme === "gray" || savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }

  function updateThemeButton(){
    const dark = document.body.classList.contains("dark-theme");
    themeButton.textContent = dark ? "☀️ Светлая тема" : "⚫ Серая тема";
    themeButton.setAttribute("aria-label", dark ? "Переключить на светлую тему" : "Переключить на тёмную тему");
  }

  updateThemeButton();

  themeButton.addEventListener("click", function(){
    const dark = document.body.classList.toggle("dark-theme");
    localStorage.setItem("eduLevelTheme", dark ? "gray" : "light");
    updateThemeButton();
  });
})();
