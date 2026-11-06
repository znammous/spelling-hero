// بيانات اللعبة الثابتة: خطط الإملاء، الرتب، المعدّات، الشخصيات، والإعدادات
// كل كلمة بالشكل: 'الكلمة|الرمز|الترجمة'

// ───── خطة الإملاء العربية: من الكلمات القصيرة إلى الهمزات ─────
// focus = الحروف التي تُخفى في سؤال «أكمل الكلمة» لأنها موضوع الدرس
const AR_REGIONS = [
  { id: 'ar1', stage: 1, name: 'مرج الحروف', icon: '🌼', label: 'كلمات من ثلاثة حروف', focus: '',
    tip: 'اكتب كل صوت تسمعه بحرف واحد، ولا تنسَ وصل الحروف.',
    animal: { emoji: '🐇', name: 'الأرنب' },
    words: ['بيت|🏠|house', 'باب|🚪|door', 'قلم|✏️|pen', 'كلب|🐕|dog', 'شمس|☀️|sun', 'قمر|🌙|moon', 'بحر|🌊|sea', 'نهر|🏞️|river', 'فيل|🐘|elephant', 'جمل|🐫|camel', 'خبز|🍞|bread', 'ولد|👦|boy'] },
  { id: 'ar2', stage: 1, name: 'طريق المدود', icon: '🛤️', label: 'المدّ بالألف والواو والياء', focus: 'اوي',
    tip: 'إذا مددت الصوت فاكتب حرف المدّ: ألف أو واو أو ياء.',
    animal: { emoji: '🐢', name: 'السلحفاة' },
    words: ['نار|🔥|fire', 'تاج|👑|crown', 'دار|🏡|home', 'حار|🥵|hot', 'نور|💡|light', 'حوت|🐋|whale', 'توت|🍓|berries', 'سور|🧱|wall', 'ريح|🌬️|wind', 'ديك|🐓|rooster', 'كيس|🛍️|bag', 'عيد|🎉|feast'] },
  { id: 'ar3', stage: 1, name: 'بستان التاء المربوطة', icon: '🍎', label: 'التاء المربوطة ة', focus: 'ة',
    tip: 'التاء المربوطة في آخر الاسم، وتُنطق هاءً إذا وقفنا عليها: مدرسة.',
    animal: { emoji: '🐝', name: 'النحلة' },
    words: ['مدرسة|🏫|school', 'شجرة|🌳|tree', 'وردة|🌹|rose', 'نخلة|🌴|palm tree', 'سيارة|🚗|car', 'قطة|🐱|cat', 'بقرة|🐄|cow', 'تفاحة|🍎|apple', 'موزة|🍌|banana', 'نحلة|🐝|bee', 'سمكة|🐟|fish', 'كرة|⚽|ball'] },
  { id: 'ar4', stage: 1, name: 'وادي التاء والهاء', icon: '🏕️', label: 'التاء المفتوحة والهاء', focus: 'ته',
    tip: 'التاء المفتوحة تبقى تاءً عند الوقف: بنت. والهاء تُنطق هاءً دائماً: وجه.',
    animal: { emoji: '🦊', name: 'الثعلب' },
    words: ['بنت|👧|girl', 'زيت|🫒|oil', 'وقت|⏰|time', 'صوت|🔊|voice', 'نبات|🌱|plant', 'بنات|👭|girls', 'كتبت|✍️|she wrote', 'لعبت|🤸|she played', 'وجه|😊|face', 'قلبه|❤️|his heart', 'كتابه|📖|his book', 'انتبه|⚠️|watch out'] },

  { id: 'ar5', stage: 2, name: 'جبل الشمس والقمر', icon: '🌄', label: 'ال الشمسية والقمرية', focus: 'ل',
    tip: 'اللام تُكتب دائماً في «ال» حتى لو لم تُنطق: الشمس.',
    animal: { emoji: '🦉', name: 'البومة' },
    words: ['الشمس|☀️|the sun', 'السماء|☁️|the sky', 'النهر|🏞️|the river', 'التفاحة|🍎|the apple', 'الرجل|👨|the man', 'الدرس|📝|the lesson', 'القمر|🌙|the moon', 'الباب|🚪|the door', 'الكتاب|📖|the book', 'الولد|👦|the boy', 'الفيل|🐘|the elephant', 'الطائر|🐦|the bird'] },
  { id: 'ar6', stage: 2, name: 'قلعة الشدّة', icon: '🏯', label: 'الحرف المشدّد', focus: '',
    tip: 'الحرف المشدّد يُكتب مرة واحدة وفوقه شدّة، ولا نكرّره.',
    animal: { emoji: '🐻', name: 'الدب' },
    words: ['دبّ|🐻|bear', 'قطّ|🐈|tomcat', 'جدّ|👴|grandfather', 'سكّر|🍬|sugar', 'معلّم|👨‍🏫|teacher', 'تفّاح|🍎|apples', 'رمّان|🍎|pomegranate', 'بطّة|🦆|duck', 'نجّار|🪚|carpenter', 'خبّاز|🥖|baker', 'كرّاسة|📓|notebook', 'حدّاد|⚒️|blacksmith'] },
  { id: 'ar7', stage: 2, name: 'نبع التنوين', icon: '⛲', label: 'التنوين وألف النصب', focus: 'ا',
    tip: 'تنوين الفتح نكتب معه ألفاً: شكرًا، إلا بعد التاء المربوطة والهمزة بعد الألف: شجرةً، مساءً.',
    animal: { emoji: '🦌', name: 'الغزال' },
    words: ['شكرًا|🙏|thank you', 'عفوًا|😊|you are welcome', 'أهلًا|👋|welcome', 'صباحًا|🌅|in the morning', 'غدًا|📅|tomorrow', 'جدًا|💯|very', 'يومًا|🗓️|one day', 'ولدًا|👦|a boy', 'كتابًا|📖|a book', 'مساءً|🌃|in the evening', 'فكرةً|💡|an idea', 'رحلةً|🧳|a trip'] },
  { id: 'ar8', stage: 2, name: 'جسر لام الألف', icon: '🌉', label: 'كلمات فيها «لا»', focus: 'ل',
    tip: 'اللام والألف تتعانقان في الكتابة «لا»، فاكتب اللام ثم الألف.',
    animal: { emoji: '🕊️', name: 'الحمامة' },
    words: ['سلام|🕊️|peace', 'كلام|💬|speech', 'هلال|🌙|crescent', 'بلاد|🌍|country', 'فلاح|🧑‍🌾|farmer', 'لاعب|⚽|player', 'ملابس|👕|clothes', 'طلاب|🧑‍🎓|students', 'صلاة|🕌|prayer', 'علامة|✅|mark', 'ثلاثة|3️⃣|three', 'قلادة|📿|necklace'] },
  { id: 'ar9', stage: 2, name: 'غابة الحروف المتشابهة', icon: '🌲', label: 'ض ظ، س ص، ت ط، ذ ز، ق ك', focus: 'ضظسصتطذزقكث',
    tip: 'استمع جيداً لمخرج الحرف، واحفظ شكل الكلمة: ضفدع بالضاد، وظرف بالظاء.',
    animal: { emoji: '🐸', name: 'الضفدع' },
    words: ['ضفدع|🐸|frog', 'ظرف|✉️|envelope', 'صقر|🦅|falcon', 'سيف|⚔️|sword', 'طبل|🥁|drum', 'تمر|🌴|dates', 'ذهب|🪙|gold', 'زهرة|🌼|flower', 'قرد|🐒|monkey', 'كرسي|🪑|chair', 'ثعلب|🦊|fox', 'سلحفاة|🐢|turtle'] },

  { id: 'ar10', stage: 3, name: 'شاطئ الهمزة الأولى', icon: '🏖️', label: 'الهمزة في أول الكلمة', focus: 'أإا',
    tip: 'همزة القطع تُكتب: أسد، إبرة. وهمزة الوصل لا تُكتب: ابن، اسم، اكتب.',
    animal: { emoji: '🦁', name: 'الأسد' },
    words: ['أسد|🦁|lion', 'أرنب|🐇|rabbit', 'أم|👩|mother', 'أب|👨|father', 'أنف|👃|nose', 'أذن|👂|ear', 'إبرة|🪡|needle', 'إصبع|☝️|finger', 'إبريق|🫖|kettle', 'ابن|👶|son', 'اسم|📛|name', 'اكتب|✍️|write'] },
  { id: 'ar11', stage: 3, name: 'كهف الهمزة المتوسطة', icon: '⛰️', label: 'الهمزة في وسط الكلمة', focus: 'أؤئ',
    tip: 'انظر إلى الحركة الأقوى: الكسرة على نبرة ئ، ثم الضمة على واو ؤ، ثم الفتحة على ألف أ.',
    animal: { emoji: '🐺', name: 'الذئب' },
    words: ['فأر|🐭|mouse', 'رأس|🗣️|head', 'كأس|🏆|cup', 'فأس|🪓|axe', 'ذئب|🐺|wolf', 'بئر|🕳️|well', 'طائرة|✈️|airplane', 'رئيس|🧑‍💼|president', 'مئة|💯|hundred', 'مؤذن|🕌|muezzin', 'سؤال|❓|question', 'مؤمن|🤲|believer'] },
  { id: 'ar12', stage: 3, name: 'صحراء الهمزة المتطرفة', icon: '🏜️', label: 'الهمزة في آخر الكلمة', focus: 'ءأؤئ',
    tip: 'في آخر الكلمة انظر إلى حركة الحرف قبلها: شاطئ، لؤلؤ، قرأ. فإن كان ساكناً كُتبت على السطر: جزء، ماء.',
    animal: { emoji: '🦂', name: 'العقرب' },
    words: ['ماء|💧|water', 'هواء|💨|air', 'دواء|💊|medicine', 'سماء|☁️|sky', 'صحراء|🏜️|desert', 'شاطئ|🏖️|beach', 'لؤلؤ|🦪|pearl', 'قرأ|📖|he read', 'ملجأ|⛺|shelter', 'جزء|🧩|part', 'دفء|🔥|warmth', 'بطء|🐌|slowness'] },
  { id: 'ar13', stage: 3, name: 'قمة الألف اللينة', icon: '🏔️', label: 'الألف اللينة: ا و ى', focus: 'اى',
    tip: 'أصلها واو تُكتب ألفاً: عصا (عصوان). وأصلها ياء تُكتب ى: مشى (يمشي).',
    animal: { emoji: '🦅', name: 'النسر' },
    words: ['مشى|🚶|he walked', 'رمى|🏀|he threw', 'بكى|😢|he cried', 'على|🔝|on', 'إلى|➡️|to', 'حلوى|🍬|sweets', 'مستشفى|🏥|hospital', 'عصا|🦯|stick', 'دعا|🤲|he called', 'نما|🌱|it grew', 'سما|🎈|it rose', 'علا|⬆️|it went up'] },
];

// ───── خطة الإملاء الإنجليزية ─────
const EN_REGIONS = [
  { id: 'en1', stage: 1, name: 'جزيرة الحروف القصيرة', icon: '🏝️', label: 'Short vowels (CVC)', focus: 'aeiou',
    tip: 'الحرف المتحرك في الوسط قصير: cat, bed, pig, dog, sun.',
    animal: { emoji: '🐥', name: 'الصوص' },
    words: ['cat|🐱|قطة', 'dog|🐶|كلب', 'sun|☀️|شمس', 'pig|🐷|خنزير', 'bed|🛏️|سرير', 'hat|🎩|قبعة', 'fox|🦊|ثعلب', 'bus|🚌|حافلة', 'net|🥅|شبكة', 'map|🗺️|خريطة', 'cup|🥤|كوب', 'box|📦|صندوق'] },
  { id: 'en2', stage: 1, name: 'مرفأ الحرفين', icon: '⚓', label: 'Blends (fr, dr, st, mp)', focus: 'frdlcstmp',
    tip: 'حرفان متجاوران يُسمع صوت كل منهما: frog, nest, lamp.',
    animal: { emoji: '🦀', name: 'السلطعون' },
    words: ['frog|🐸|ضفدع', 'flag|🚩|علم', 'crab|🦀|سلطعون', 'drum|🥁|طبل', 'swim|🏊|يسبح', 'nest|🪺|عش', 'hand|✋|يد', 'lamp|💡|مصباح', 'milk|🥛|حليب', 'tent|⛺|خيمة', 'plum|🍑|برقوق', 'jump|🤸|يقفز'] },
  { id: 'en3', stage: 1, name: 'خليج الأصوات المزدوجة', icon: '🐚', label: 'sh, ch, th, wh, ck', focus: 'shcthwk',
    tip: 'حرفان يصنعان صوتاً واحداً: ship, chick, bath, whale, duck.',
    animal: { emoji: '🐋', name: 'الحوت' },
    words: ['ship|🚢|سفينة', 'fish|🐟|سمكة', 'shell|🐚|صدفة', 'chick|🐤|صوص', 'lunch|🍱|غداء', 'chin|🧔|ذقن', 'bath|🛁|حمّام', 'thin|📏|رفيع', 'whale|🐋|حوت', 'wheel|🛞|عجلة', 'duck|🦆|بطة', 'clock|⏰|ساعة'] },
  { id: 'en4', stage: 1, name: 'تلة الـ e السحرية', icon: '🪄', label: 'Magic e', focus: 'e',
    tip: 'الـ e الأخيرة لا تُنطق، لكنها تجعل الحرف المتحرك قبلها طويلاً: kite, cake.',
    animal: { emoji: '🦄', name: 'وحيد القرن' },
    words: ['cake|🎂|كعكة', 'lake|🏞️|بحيرة', 'game|🎮|لعبة', 'bike|🚲|دراجة', 'kite|🪁|طائرة ورقية', 'five|5️⃣|خمسة', 'nine|9️⃣|تسعة', 'bone|🦴|عظمة', 'rose|🌹|وردة', 'home|🏠|منزل', 'cube|🧊|مكعب', 'tube|🧪|أنبوب'] },

  { id: 'en5', stage: 2, name: 'نهر الأحرف المتحركة', icon: '🛶', label: 'ai, ay, ee, ea, oa', focus: 'aeyo',
    tip: 'حرفان متحركان معاً يعطيان صوتاً طويلاً: rain, tree, boat.',
    animal: { emoji: '🦦', name: 'ثعلب الماء' },
    words: ['rain|🌧️|مطر', 'train|🚆|قطار', 'snail|🐌|حلزون', 'play|🎲|يلعب', 'day|🌞|يوم', 'tree|🌳|شجرة', 'bee|🐝|نحلة', 'sea|🌊|بحر', 'leaf|🍃|ورقة شجر', 'read|📖|يقرأ', 'boat|⛵|قارب', 'goat|🐐|ماعز'] },
  { id: 'en6', stage: 2, name: 'حقل الأصوات المميزة', icon: '🌾', label: 'oo, ou, ow, oy, ar, ir, or', focus: 'ouwyr',
    tip: 'احفظ مجموعات الصوت: moon, house, cow, boy, star, bird, horse.',
    animal: { emoji: '🐎', name: 'الحصان' },
    words: ['moon|🌙|قمر', 'book|📚|كتاب', 'house|🏠|بيت', 'mouse|🐭|فأر', 'cow|🐄|بقرة', 'boy|👦|ولد', 'coin|🪙|عملة', 'toy|🧸|لعبة', 'star|⭐|نجمة', 'girl|👧|بنت', 'bird|🐦|طائر', 'horse|🐴|حصان'] },
  { id: 'en7', stage: 2, name: 'مدينة الكلمات الشائعة', icon: '🏙️', label: 'Sight words', focus: '',
    tip: 'هذه الكلمات لا تتبع القاعدة، فنحفظ شكلها كاملاً.',
    animal: { emoji: '🐒', name: 'القرد' },
    words: ['the|👉|الـ (أداة التعريف)', 'they|👥|هم', 'said|💬|قال', 'was|⏪|كان', 'what|❓|ماذا', 'where|📍|أين', 'because|💡|لأن', 'friend|🤝|صديق', 'people|👨‍👩‍👧|ناس', 'there|👈|هناك', 'their|🎒|لهم', 'could|💪|استطاع'] },
  { id: 'en8', stage: 2, name: 'قوس الألوان والأرقام', icon: '🌈', label: 'Colors & numbers', focus: '',
    tip: 'انتبه للحروف المكررة: yellow، وللحروف الصامتة: eight.',
    animal: { emoji: '🦜', name: 'الببغاء' },
    words: ['yellow|💛|أصفر', 'orange|🟠|برتقالي', 'purple|💜|بنفسجي', 'green|💚|أخضر', 'black|🖤|أسود', 'white|🤍|أبيض', 'brown|🤎|بني', 'three|3️⃣|ثلاثة', 'seven|7️⃣|سبعة', 'eight|8️⃣|ثمانية', 'eleven|🔢|أحد عشر', 'twelve|🕛|اثنا عشر'] },

  { id: 'en9', stage: 3, name: 'برج الأيام والشهور', icon: '🗼', label: 'Days & months', focus: '',
    tip: 'أيام الأسبوع والشهور تبدأ بحرف كبير دائماً، وانتبه: Wednesday فيها d صامتة.',
    animal: { emoji: '🐼', name: 'الباندا' },
    words: ['Monday|📅|الإثنين', 'Tuesday|📅|الثلاثاء', 'Wednesday|📅|الأربعاء', 'Thursday|📅|الخميس', 'Friday|📅|الجمعة', 'Saturday|📅|السبت', 'Sunday|📅|الأحد', 'January|❄️|يناير', 'February|💝|فبراير', 'March|🌱|مارس', 'April|🌷|أبريل', 'August|🏖️|أغسطس'] },
  { id: 'en10', stage: 3, name: 'قصر الحروف الصامتة', icon: '🏰', label: 'Silent letters', focus: 'kbwgh',
    tip: 'حروف تُكتب ولا تُنطق: knife, lamb, write, night, castle.',
    animal: { emoji: '🦇', name: 'الخفاش' },
    words: ['knife|🔪|سكين', 'knee|🦵|ركبة', 'lamb|🐑|حَمَل', 'thumb|👍|إبهام', 'write|✍️|يكتب', 'wrong|❌|خطأ', 'night|🌃|ليل', 'light|💡|ضوء', 'ghost|👻|شبح', 'hour|⏳|ساعة زمنية', 'castle|🏰|قلعة', 'island|🏝️|جزيرة'] },
  { id: 'en11', stage: 3, name: 'ساحل الأصوات المتغيرة', icon: '🌅', label: 'Soft c/g, ph, -tion', focus: 'cgpt',
    tip: 'c قد تُنطق s، و g قد تُنطق j، و ph تُنطق f، و tion تُنطق «شن».',
    animal: { emoji: '🐬', name: 'الدلفين' },
    words: ['city|🏙️|مدينة', 'juice|🧃|عصير', 'pencil|✏️|قلم رصاص', 'giant|🗿|عملاق', 'page|📄|صفحة', 'bridge|🌉|جسر', 'phone|📱|هاتف', 'dolphin|🐬|دلفين', 'elephant|🐘|فيل', 'station|🚉|محطة', 'question|❓|سؤال', 'picture|🖼️|صورة'] },
  { id: 'en12', stage: 3, name: 'قمة الأبطال', icon: '🏔️', label: 'Tricky long words', focus: '',
    tip: 'قسّم الكلمة الطويلة إلى مقاطع واكتبها مقطعاً مقطعاً: beau-ti-ful.',
    animal: { emoji: '🐅', name: 'النمر' },
    words: ['school|🏫|مدرسة', 'teacher|👩‍🏫|معلمة', 'beautiful|🌸|جميل', 'mountain|⛰️|جبل', 'library|📚|مكتبة', 'breakfast|🍳|فطور', 'vegetable|🥕|خضار', 'weather|🌦️|طقس', 'daughter|👧|ابنة', 'bicycle|🚲|دراجة هوائية', 'tomorrow|📅|غداً', 'different|🔀|مختلف'] },
];

const STAGES = {
  1: { name: 'المرحلة الأولى', icon: '🌱', note: 'البداية' },
  2: { name: 'المرحلة الثانية', icon: '🌿', note: 'التوسّع' },
  3: { name: 'المرحلة الثالثة', icon: '🌳', note: 'الإتقان' },
};

const WORLDS = [
  { id: 'ar', name: 'مملكة الضاد', short: 'الخطة العربية', icon: '🕌', planet: '📜', glow: '#ffc93c', c: '#1f9e9a', regions: AR_REGIONS,
    hint: 'من الكلمات القصيرة حتى الهمزات. أتقن كل منطقة لتفتح التالية وتكتشف حيوانها!' },
  { id: 'en', name: 'مملكة الأبجدية', short: 'English Plan', icon: '🗽', planet: '🔤', glow: '#8fdcff', c: '#3f7fd9', regions: EN_REGIONS,
    hint: 'From short vowels to tricky words — من الحروف القصيرة حتى الكلمات الصعبة.' },
];

// الرتبة تعتمد على أفضل نتيجة في سباق الحروف (كلمات صحيحة في السباق)
const RANKS = [
  { min: 0,  emoji: '🌱', name: 'كاتب صغير' },
  { min: 5,  emoji: '✏️', name: 'حارس الحروف' },
  { min: 10, emoji: '📖', name: 'صديق القاموس' },
  { min: 15, emoji: '🛡️', name: 'فارس الإملاء' },
  { min: 20, emoji: '🧭', name: 'قائد الكلمات' },
  { min: 25, emoji: '🦸', name: 'بطل الإملاء' },
  { min: 30, emoji: '🏆', name: 'بطل الأبطال' },
  { min: 40, emoji: '👑', name: 'أسطورة الإملاء' },
];

const ITEMS = [
  { id: 'pencil',  emoji: '✏️', name: 'قلم البطل',      price: 20 },
  { id: 'ruler',   emoji: '📏', name: 'المسطرة',        price: 30 },
  { id: 'bag',     emoji: '🎒', name: 'الحقيبة',        price: 45 },
  { id: 'books',   emoji: '📚', name: 'كتب المغامرة',   price: 60 },
  { id: 'cape',    emoji: '🦸', name: 'عباءة البطل',    price: 80 },
  { id: 'shield',  emoji: '🛡️', name: 'درع الحروف',     price: 100 },
  { id: 'scope',   emoji: '🔭', name: 'المنظار',        price: 120 },
  { id: 'wand',    emoji: '🪄', name: 'عصا الكلمات',    price: 150 },
  { id: 'rocket',  emoji: '🚀', name: 'صاروخ السرعة',   price: 180 },
  { id: 'crown',   emoji: '👑', name: 'تاج الأبطال',    price: 220 },
  { id: 'castle',  emoji: '🏰', name: 'قلعة البطل',     price: 320 },
];

// قطع نادرة لا تُباع: تأتي من كنز رحلة اليوم فقط
const RARE_ITEMS = [
  { id: 'r-scroll',  emoji: '📜', name: 'المخطوطة القديمة' },
  { id: 'r-feather', emoji: '🪶', name: 'الريشة الذهبية' },
  { id: 'r-key',     emoji: '🗝️', name: 'مفتاح القاموس' },
  { id: 'r-gem',     emoji: '💎', name: 'جوهرة الحروف' },
  { id: 'r-vase',    emoji: '🏺', name: 'جرّة الكلمات' },
  { id: 'r-medal',   emoji: '🏅', name: 'وسام الإملاء' },
];

const AVATARS = [
  '🧒', '👦', '👧', '🦸', '🦸‍♀️', '🧑‍🚀', '🧑‍🎓', '🧕', '🤠', '🕵️',
  '🐰', '🐱', '🐶', '🐼', '🐨', '🐵', '🦊', '🐯', '🦁', '🐸', '🦄', '🐢', '🦉', '🦜', '🐧', '🐝', '🦋',
  '⭐', '🌟', '💎', '👑', '🏆', '🌸', '🌻', '🍎', '🍉', '🍓',
];

// ألوان بطاقات الأبطال
const KID_COLORS = ['#c2457d', '#1f9e9a', '#3f7fd9', '#e8872b', '#7a4fa3', '#2f8f5b', '#d9412f'];

const BADGES = [
  { id: 'w1',    icon: '🌟', name: 'أول كلمة',       desc: 'أتقن كلمة واحدة',     test: s => s.mastered >= 1 },
  { id: 'w25',   icon: '📘', name: 'جامع الكلمات',    desc: 'أتقن 25 كلمة',        test: s => s.mastered >= 25 },
  { id: 'w100',  icon: '📚', name: 'صاحب القاموس',    desc: 'أتقن 100 كلمة',       test: s => s.mastered >= 100 },
  { id: 'd3',    icon: '🔥', name: 'ثلاثة أيام',      desc: 'العب 3 أيام متتالية', test: s => s.streak >= 3 },
  { id: 'd7',    icon: '🌋', name: 'أسبوع كامل',      desc: 'العب 7 أيام متتالية', test: s => s.streak >= 7 },
  { id: 'per',   icon: '🎯', name: 'جولة كاملة',      desc: 'جولة بلا أي خطأ',     test: s => s.perfect >= 1 },
  { id: 'per5',  icon: '🏹', name: 'الرامي الدقيق',   desc: '5 جولات بلا خطأ',     test: s => s.perfect >= 5 },
  { id: 'race',  icon: '🏃', name: 'العدّاء',          desc: '10 كلمات في السباق',  test: s => s.best >= 10 },
  { id: 'exam',  icon: '📝', name: 'نجم الاختبار',    desc: 'اختبار بنتيجة كاملة', test: s => s.examPerfect >= 1 },
  { id: 'free',  icon: '✍️', name: 'صانع القوائم',    desc: 'تدرّب في الوضع الحر', test: s => s.freeRounds >= 1 },
  { id: 'ar',    icon: '🕌', name: 'فارس الضاد',      desc: 'أكمل الخطة العربية',  test: s => s.arDone },
  { id: 'en',    icon: '🗽', name: 'English Hero',    desc: 'أكمل الخطة الإنجليزية', test: s => s.enDone },
];

const CONFIG = {
  practiceLength: 10,   // أقصى عدد كلمات جولة التدريب
  warmupLength: 5,      // كلمات الإحماء
  raceSeconds: 90,      // مدة سباق الحروف
  maxBox: 5,            // أعلى صندوق في نظام التكرار المتباعد
  masteredBox: 3,       // الكلمة متقنة عند هذا الصندوق: يعني كتبها وحده بلا مساعدة
  audioOnlyBox: 4,      // من هذا الصندوق تُملى الكلمة سماعاً دون إظهارها
  unlockAt: 0.75,       // نسبة إتقان المنطقة لفتح التالية
  idleCapMs: 30000,     // أقصى وقت يُحسب للسؤال الواحد
  chestRareChance: 0.3, // احتمال قطعة نادرة في كنز اليوم
};

const COINS = { perCorrect: 1, perWrite: 2, roundDone: 5, perfect: 10, unlock: 15, animal: 10, record: 10, chestMin: 20, chestMax: 50 };

const DEFAULT_SETTINGS = {
  flash: 3,             // ثوانٍ إظهار الكلمة: 0 سماعي فقط، -1 تبقى ظاهرة
  tries: 2,             // محاولات الكتابة لكل كلمة
  speak: true,
  rate: 0.8,
  voiceAr: '', voiceEn: '',
  ignoreTashkeel: true,
  lenientHamza: false,  // التساهل في الهمزات، وهو مغلق افتراضياً لأنها جوهر الإملاء
  strictCase: false,    // مراعاة الأحرف الكبيرة في الإنجليزية
  goalMin: 15,          // هدف الوقت اليومي
};

// حروف يخلط بينها الطفل: منها تأتي الخيارات المشتِّتة
const CONFUSE = {
  'ة': 'ته', 'ت': 'ةطه', 'ه': 'ةح', 'ا': 'أىو', 'أ': 'إاء', 'إ': 'أاء', 'آ': 'أا', 'ء': 'أئؤ', 'ؤ': 'ئءو', 'ئ': 'ؤءي', 'ى': 'اي', 'ي': 'ىئ', 'و': 'ؤا',
  'س': 'صث', 'ص': 'سض', 'ض': 'ظدص', 'ظ': 'ضذز', 'ذ': 'زظد', 'ز': 'ذظ', 'ث': 'ست', 'ط': 'تظ', 'ق': 'كغ', 'ك': 'قت', 'ح': 'هخ', 'خ': 'حغ', 'ع': 'غء', 'غ': 'عق',
  'د': 'ذض', 'ج': 'حش', 'ن': 'مل', 'م': 'نب', 'ل': 'رن', 'ر': 'زل', 'ف': 'قث', 'ب': 'تن', 'ش': 'سج',
  a: 'eu', e: 'ia', i: 'ey', o: 'ua', u: 'oa', c: 'ks', k: 'cq', s: 'cz', g: 'jq', j: 'g', q: 'k', z: 's', f: 'vp', v: 'fw', b: 'dp', d: 'bt', p: 'bq', t: 'd', m: 'n', n: 'm', l: 'r', r: 'l', w: 'vu', y: 'ie', h: 'nk', x: 'zs',
};

// قاموس مصغّر: يترجم كلمات الوضع الحر بلا إنترنت (تضاف إليه كلمات الخطط تلقائياً)
const DICT = {
  cat:'قطة', dog:'كلب', bird:'طائر', fish:'سمكة', horse:'حصان', lion:'أسد', tiger:'نمر',
  bear:'دب', rabbit:'أرنب', duck:'بطة', cow:'بقرة', sheep:'خروف', camel:'جمل', bee:'نحلة',
  butterfly:'فراشة', elephant:'فيل', monkey:'قرد', chicken:'دجاجة', mouse:'فأر', snake:'ثعبان',
  apple:'تفاحة', banana:'موزة', orange:'برتقالة', grapes:'عنب', mango:'مانجو', lemon:'ليمونة',
  bread:'خبز', milk:'حليب', water:'ماء', rice:'أرز', egg:'بيضة', cheese:'جبن', honey:'عسل',
  sugar:'سكر', salt:'ملح', tea:'شاي', juice:'عصير', meat:'لحم', soup:'حساء', cake:'كعكة',
  book:'كتاب', pen:'قلم حبر', pencil:'قلم رصاص', bag:'حقيبة', desk:'مكتب', chair:'كرسي',
  table:'طاولة', door:'باب', window:'نافذة', school:'مدرسة', teacher:'معلّم', student:'طالب',
  class:'صف', lesson:'درس', paper:'ورقة', ruler:'مسطرة', eraser:'ممحاة', color:'لون',
  house:'بيت', home:'منزل', room:'غرفة', kitchen:'مطبخ', garden:'حديقة', bed:'سرير',
  car:'سيارة', bus:'حافلة', train:'قطار', plane:'طائرة', ship:'سفينة', bike:'دراجة',
  road:'طريق', city:'مدينة', village:'قرية', market:'سوق', shop:'متجر', hospital:'مستشفى',
  mosque:'مسجد', airport:'مطار', ticket:'تذكرة', passport:'جواز سفر', 
  sun:'شمس', moon:'قمر', star:'نجمة', sky:'سماء', cloud:'سحابة', rain:'مطر', snow:'ثلج',
  wind:'رياح', sea:'بحر', river:'نهر', mountain:'جبل', tree:'شجرة', flower:'زهرة',
  grass:'عشب', sand:'رمل', fire:'نار', stone:'حجر', earth:'أرض', night:'ليل', day:'نهار',
  father:'أب', mother:'أم', brother:'أخ', sister:'أخت', family:'عائلة', friend:'صديق',
  boy:'ولد', girl:'بنت', baby:'طفل رضيع', child:'طفل', man:'رجل', woman:'امرأة',
  hand:'يد', eye:'عين', ear:'أذن', nose:'أنف', mouth:'فم', head:'رأس', foot:'قدم',
  heart:'قلب', hair:'شعر', tooth:'سن', face:'وجه',
  red:'أحمر', blue:'أزرق', green:'أخضر', yellow:'أصفر', black:'أسود', white:'أبيض',
  big:'كبير', small:'صغير', happy:'سعيد', sad:'حزين', fast:'سريع', slow:'بطيء',
  hot:'حار', cold:'بارد', new:'جديد', old:'قديم', good:'جيد', beautiful:'جميل',
  clean:'نظيف', strong:'قوي', kind:'لطيف', brave:'شجاع',
  read:'يقرأ', write:'يكتب', play:'يلعب', eat:'يأكل', drink:'يشرب', sleep:'ينام',
  run:'يجري', walk:'يمشي', jump:'يقفز', sing:'يغني', draw:'يرسم', help:'يساعد',
  learn:'يتعلم', study:'يدرس', open:'يفتح', close:'يغلق', fly:'يطير', swim:'يسبح',
  love:'حب', peace:'سلام', time:'وقت', year:'سنة', month:'شهر', week:'أسبوع',
  today:'اليوم', tomorrow:'غداً', money:'مال', game:'لعبة', gift:'هدية', name:'اسم',
  one:'واحد', two:'اثنان', three:'ثلاثة', four:'أربعة', five:'خمسة', six:'ستة',
  seven:'سبعة', eight:'ثمانية', nine:'تسعة', ten:'عشرة'
};
