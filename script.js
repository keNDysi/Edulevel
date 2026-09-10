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
    "МАТЕМАТИКА":      { xp: 0, level: 0 },
    "РУССКИЙ ЯЗЫК":    { xp: 0, level: 0 },
    "АНГЛИЙСКИЙ ЯЗЫК": { xp: 0, level: 0 },
    "ФИЗИКА":          { xp: 0, level: 0 },
    "ХИМИЯ":           { xp: 0, level: 0 },
    "БИОЛОГИЯ":        { xp: 0, level: 0 },
    "ИСТОРИЯ":         { xp: 0, level: 0 },
    "ГЕОГРАФИЯ":       { xp: 0, level: 0 }
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

const savedClass = localStorage.getItem("studentClass");
if (savedClass) classSelect.value = savedClass;

classSelect.addEventListener("change", function () {
    localStorage.setItem("studentClass", classSelect.value);
    alert("Класс " + classSelect.value + " выбран");
    if (subjectSelect.value === "МАТЕМАТИКА") {
        updateTopics();
    }
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
        "Углы"
    ]
};

const topics = {
    "РУССКИЙ ЯЗЫК":    ["Орфография", "Пунктуация", "Части речи"],
    "АНГЛИЙСКИЙ ЯЗЫК": ["Времена", "Неправильные глаголы", "Словарный запас"],
    "ФИЗИКА":          ["Механика", "Сила и движение", "Энергия"],
    "ХИМИЯ":           ["Вещества", "Атомы и молекулы", "Химические реакции"],
    "БИОЛОГИЯ":        ["Клетка", "Растения", "Животные"],
    "ИСТОРИЯ":         ["Древний мир", "Средние века", "Новое время"],
    "ГЕОГРАФИЯ":       ["Материки", "Климат", "Природные зоны"]
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
};

// ---------- ДЕМО-ЗАДАНИЯ ДЛЯ ДРУГИХ ПРЕДМЕТОВ ----------

const tasks = {
    "РУССКИЙ ЯЗЫК": {},
    "АНГЛИЙСКИЙ ЯЗЫК": {},
    "ФИЗИКА": {},
    "ХИМИЯ": {},
    "БИОЛОГИЯ": {},
    "ИСТОРИЯ": {},
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

    const userAnswer = answerInput.value.trim().toLowerCase().replace(/\s+/g, " ");
    const expected   = String(currentTask.answer).trim().toLowerCase().replace(/\s+/g, " ");

    if (userAnswer === expected) {

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
updateTopics();