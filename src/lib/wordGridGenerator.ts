// ============================================================
// Word Grid — Dictionary, Generator, and Path Validation
// ============================================================

import { getWordPoints } from '../types';

// Curated dictionary of common valid words (3+ letters)
export const COMMON_DICTIONARY: string[] = [
  'ACT', 'ACE', 'AGE', 'AGO', 'AID', 'AIM', 'AIR', 'ALL', 'AND', 'ANT', 'ANY', 'APE', 'ARC', 'ARM', 'ART', 'ASH', 'ASK', 'BAD', 'BAG', 'BAR', 'BAT', 'BAY', 'BED', 'BEE', 'BEG', 'BET', 'BID', 'BIG', 'BIN', 'BIT', 'BOB', 'BOW', 'BOX', 'BOY', 'BUS', 'BUT', 'BUY', 'BYE', 'CAB', 'CAN', 'CAP', 'CAR', 'CAT', 'COW', 'CRY', 'CUP', 'CUT', 'DAD', 'DAM', 'DAY', 'DEN', 'DEW', 'DID', 'DIG', 'DIM', 'DIP', 'DOG', 'DOT', 'DRY', 'DUE', 'DUG', 'EAR', 'EAT', 'EGG', 'EGO', 'ELF', 'ELK', 'ELM', 'END', 'ERA', 'EVE', 'EYE', 'FAN', 'FAR', 'FAT', 'FEW', 'FIG', 'FIN', 'FIT', 'FIX', 'FLY', 'FOG', 'FOR', 'FOX', 'FRY', 'FUN', 'FUR', 'GAP', 'GAS', 'GEL', 'GEM', 'GET', 'GIN', 'GLAD', 'GLOW', 'GNU', 'GOD', 'GOT', 'GUM', 'GUN', 'GUT', 'GUY', 'GYM', 'HAD', 'HAM', 'HAT', 'HAY', 'HEN', 'HER', 'HEY', 'HID', 'HIM', 'HIP', 'HIS', 'HIT', 'HOP', 'HOT', 'HOW', 'HUB', 'HUG', 'HUM', 'HUT', 'ICE', 'ILL', 'INK', 'INN', 'ION', 'ITS', 'IVY', 'JAM', 'JAR', 'JAW', 'JAY', 'JET', 'JOB', 'JOG', 'JOY', 'JUG', 'KEY', 'KID', 'KIN', 'KIT', 'LAB', 'LAD', 'LAP', 'LAW', 'LAY', 'LED', 'LEG', 'LET', 'LID', 'LIE', 'LIP', 'LIT', 'LOG', 'LOT', 'LOW', 'MAD', 'MAN', 'MAP', 'MAT', 'MAY', 'MEN', 'MET', 'MUD', 'MUG', 'MOM', 'NET', 'NEW', 'NOD', 'NOT', 'NOW', 'NUT', 'OAK', 'OAR', 'OAT', 'ODD', 'OFF', 'OIL', 'OLD', 'ONE', 'OPT', 'ORB', 'OUR', 'OUT', 'OWL', 'OWN', 'PAN', 'PAY', 'PEA', 'PEN', 'PET', 'PIE', 'PIG', 'PIN', 'PIT', 'POD', 'POP', 'POT', 'PRO', 'PUB', 'PUP', 'PUT', 'RAG', 'RAM', 'RAN', 'RAP', 'RAT', 'RAW', 'RAY', 'RED', 'RIB', 'RID', 'RIG', 'RIM', 'RIP', 'ROB', 'ROD', 'ROT', 'ROW', 'RUB', 'RUG', 'RUN', 'RUT', 'RYE', 'SAD', 'SAG', 'SAP', 'SAT', 'SAW', 'SAY', 'SEA', 'SEE', 'SET', 'SEW', 'SHE', 'SHY', 'SIN', 'SIP', 'SIR', 'SIT', 'SKI', 'SKY', 'SLY', 'SOB', 'SON', 'SOW', 'SOY', 'SPY', 'SUB', 'SUE', 'SUM', 'SUN', 'TAB', 'TAG', 'TAN', 'TAP', 'TAR', 'TAX', 'TEA', 'TEN', 'THE', 'THY', 'TIE', 'TIN', 'TIP', 'TOE', 'TON', 'TOP', 'TOY', 'TRY', 'TUB', 'TUG', 'TWO', 'URN', 'USE', 'VAN', 'VAT', 'VET', 'VIA', 'VOW', 'WAR', 'WAS', 'WAY', 'WEB', 'WED', 'WET', 'WHO', 'WHY', 'WIG', 'WIN', 'WIT', 'WON', 'YAK', 'YAP', 'YEA', 'YES', 'YET', 'YOU', 'ZEN', 'ZIP', 'ZOO',
  // 4 letters
  'ABLE', 'ACHE', 'ACID', 'AGED', 'AIDE', 'AIRS', 'ALLY', 'ALSO', 'AMEN', 'ARCH', 'AREA', 'ARMY', 'AWAY', 'BABY', 'BACK', 'BAKE', 'BALL', 'BAND', 'BANK', 'BARE', 'BARK', 'BARN', 'BASE', 'BATH', 'BEAK', 'BEAM', 'BEAN', 'BEAR', 'BEAT', 'BEEN', 'BEER', 'BELL', 'BELT', 'BEND', 'BENT', 'BEST', 'BIKE', 'BILL', 'BIND', 'BIRD', 'BITE', 'BLOW', 'BLUE', 'BOAT', 'BOIL', 'BOLD', 'BOLT', 'BOMB', 'BOND', 'BONE', 'BOOK', 'BOOM', 'BORN', 'BOSS', 'BOTH', 'BOWL', 'BURN', 'BURY', 'BUSH', 'BUSY', 'CAFE', 'CAGE', 'CAKE', 'CALL', 'CALM', 'CAMP', 'CANE', 'CAPE', 'CARD', 'CARE', 'CART', 'CASE', 'CASH', 'CAST', 'CAVE', 'CELL', 'CHAT', 'CHEF', 'CHIN', 'CHIP', 'CITY', 'CLAP', 'CLAW', 'CLAY', 'CLIP', 'CLUB', 'CLUE', 'COAL', 'COAT', 'COIN', 'COLD', 'COMB', 'COME', 'COOK', 'COOL', 'COPE', 'COPY', 'CORD', 'CORE', 'CORN', 'COST', 'CRAB', 'CRAM', 'CREW', 'CROP', 'CROW', 'CURE', 'CURL', 'DARK', 'DART', 'DATE', 'DAWN', 'DEAD', 'DEAF', 'DEAL', 'DEAN', 'DEAR', 'DEBT', 'DECK', 'DEED', 'DEEM', 'DEEP', 'DEER', 'DESK', 'DIET', 'DIRT', 'DISC', 'DISH', 'DISK', 'DIVE', 'DOCK', 'DOME', 'DONE', 'DOOM', 'DOOR', 'DOSE', 'DOWN', 'DRAG', 'DRAW', 'DROP', 'DRUM', 'DUCK', 'DULL', 'DUMP', 'DUST', 'DUTY', 'EACH', 'EARL', 'EARN', 'EASE', 'EAST', 'EASY', 'EDGE', 'EVEN', 'EVER', 'EVIL', 'EXAM', 'EXIT', 'FACE', 'FACT', 'FADE', 'FAIL', 'FAIR', 'FALL', 'FAME', 'FARM', 'FAST', 'FATE', 'FEAR', 'FEED', 'FEEL', 'FEET', 'FELL', 'FELT', 'FILE', 'FILL', 'FILM', 'FIND', 'FINE', 'FIRE', 'FIRM', 'FISH', 'FIST', 'FLAT', 'FLEE', 'FLEW', 'FLOW', 'FOAM', 'FOIL', 'FOLD', 'FOLK', 'FOOD', 'FOOL', 'FOOT', 'FORK', 'FORM', 'FORT', 'FOUR', 'FREE', 'FROG', 'FROM', 'FUEL', 'FULL', 'FUND', 'FURY', 'GAIN', 'GAME', 'GATE', 'GEAR', 'GIFT', 'GIRL', 'GIVE', 'GLAD', 'GOAL', 'GOAT', 'GOLD', 'GOLF', 'GONE', 'GOOD', 'GRAB', 'GRAY', 'GREW', 'GRID', 'GRIN', 'GRIP', 'GROW', 'GULF', 'HAIR', 'HALF', 'HALL', 'HALT', 'HAND', 'HANG', 'HARD', 'HARM', 'HATE', 'HAVE', 'HAWK', 'HEAD', 'HEAL', 'HEAP', 'HEAR', 'HEAT', 'HELD', 'HELL', 'HELP', 'HERD', 'HERE', 'HERO', 'HIDE', 'HIGH', 'HIKE', 'HILL', 'HINT', 'HIRE', 'HOLD', 'HOLE', 'HOLY', 'HOME', 'HOOD', 'HOOK', 'HOPE', 'HORN', 'HOSE', 'HOST', 'HOUR', 'HUGE', 'HUNG', 'HUNT', 'HURT', 'IDEA', 'IDLE', 'INCH', 'INTO', 'IRON', 'ITEM', 'JACK', 'JAIL', 'JOIN', 'JOKE', 'JUMP', 'JURY', 'JUST', 'KEEN', 'KEEP', 'KEPT', 'KICK', 'KILL', 'KIND', 'KING', 'KISS', 'KITE', 'KNEE', 'KNEW', 'KNIT', 'KNOT', 'KNOW', 'LACK', 'LADY', 'LAID', 'LAKE', 'LAMB', 'LAMP', 'LAND', 'LANE', 'LAST', 'LATE', 'LEAD', 'LEAF', 'LEAK', 'LEAN', 'LEAP', 'LEFT', 'LEND', 'LENS', 'LENT', 'LESS', 'LIFE', 'LIFT', 'LIKE', 'LIME', 'LINE', 'LINK', 'LION', 'LIPS', 'LIST', 'LIVE', 'LOAD', 'LOAF', 'LOAN', 'LOCK', 'LONG', 'LOOK', 'LORD', 'LOSE', 'LOSS', 'LOST', 'LOUD', 'LOVE', 'LUCK', 'MADE', 'MAID', 'MAIL', 'MAIN', 'MAKE', 'MALE', 'MALL', 'MANY', 'MARK', 'MASK', 'MASS', 'MATE', 'MAZE', 'MEAL', 'MEAN', 'MEAT', 'MEET', 'MELT', 'MEND', 'MESS', 'MILD', 'MILE', 'MILK', 'MILL', 'MIND', 'MINE', 'MISS', 'MOOD', 'MOON', 'MORE', 'MOST', 'MOVE', 'MUCH', 'MUST', 'NAME', 'NAVY', 'NEAR', 'NEAT', 'NECK', 'NEED', 'NEST', 'NEWS', 'NEXT', 'NICE', 'NINE', 'NODE', 'NONE', 'NOON', 'NOSE', 'NOTE', 'OATH', 'OBEY', 'ONCE', 'ONLY', 'ONTO', 'OPEN', 'ORAL', 'OVER', 'PACE', 'PACK', 'PAGE', 'PAID', 'PAIN', 'PAIR', 'PALE', 'PALM', 'PARK', 'PART', 'PASS', 'PAST', 'PATH', 'PEAK', 'PEAR', 'PEEL', 'PEER', 'PICK', 'PILE', 'PILL', 'PINE', 'PINK', 'PINT', 'PIPE', 'PLAN', 'PLAY', 'PLEA', 'PLOT', 'PLUG', 'POEM', 'POET', 'POLE', 'POLL', 'POOL', 'POOR', 'PORT', 'POST', 'POUR', 'PRAY', 'PULL', 'PUMP', 'PURE', 'PUSH', 'QUIT', 'RACE', 'RAID', 'RAIL', 'RAIN', 'RANK', 'RARE', 'RATE', 'READ', 'REAL', 'REAP', 'REAR', 'RELY', 'RENT', 'REST', 'RICE', 'RICH', 'RIDE', 'RING', 'RIOT', 'RISE', 'RISK', 'ROAD', 'ROAR', 'ROCK', 'RODE', 'ROLE', 'ROLL', 'ROOF', 'ROOM', 'ROOT', 'ROPE', 'ROSE', 'RUIN', 'RULE', 'RUSH', 'RUST', 'SAFE', 'SAID', 'SAIL', 'SALE', 'SALT', 'SAME', 'SAND', 'SAVE', 'SEAL', 'SEAM', 'SEAT', 'SEED', 'SEEK', 'SEEM', 'SEEN', 'SELF', 'SELL', 'SEND', 'SENT', 'SHED', 'SHIP', 'SHOE', 'SHOP', 'SHOT', 'SHOW', 'SHUT', 'SICK', 'SIDE', 'SIGH', 'SIGN', 'SILK', 'SILT', 'SINK', 'SITE', 'SIZE', 'SKIN', 'SLAP', 'SLID', 'SLIM', 'SLIP', 'SLOW', 'SNAP', 'SNOW', 'SOAP', 'SOIL', 'SOLD', 'SOLE', 'SOME', 'SONG', 'SOON', 'SORE', 'SOUL', 'SOUP', 'SOUR', 'SPAN', 'SPIN', 'SPOT', 'STAR', 'STAY', 'STEM', 'STEP', 'STIR', 'STOP', 'SUCH', 'SUIT', 'SURE', 'SWAM', 'SWIM', 'TALE', 'TALK', 'TALL', 'TANK', 'TAPE', 'TASK', 'TEAM', 'TEAR', 'TELL', 'TEND', 'TENT', 'TERM', 'TEST', 'TEXT', 'THAN', 'THAT', 'THEM', 'THEN', 'THEY', 'THIN', 'THIS', 'THOU', 'TIDE', 'TIDY', 'TIED', 'TIER', 'TIME', 'TINY', 'TIRE', 'TOLL', 'TONE', 'TOOK', 'TOOL', 'TORE', 'TORN', 'TOSS', 'TOUR', 'TOWN', 'TRAP', 'TRAY', 'TREE', 'TRIP', 'TRUE', 'TUBE', 'TUNE', 'TURN', 'TWIN', 'TYPE', 'UNIT', 'UPON', 'URGE', 'USED', 'USER', 'VAIN', 'VARY', 'VAST', 'VEIL', 'VEIN', 'VENT', 'VERY', 'VEST', 'VIEW', 'VINE', 'VOTE', 'WAGE', 'WAIT', 'WAKE', 'WALK', 'WALL', 'WANT', 'WARD', 'WARM', 'WARN', 'WASH', 'WAVE', 'WEAK', 'WEAR', 'WEED', 'WEEK', 'WELL', 'WENT', 'WERE', 'WEST', 'WHAT', 'WHEN', 'WIDE', 'WIFE', 'WILD', 'WILL', 'WIND', 'WINE', 'WING', 'WIPE', 'WIRE', 'WISE', 'WISH', 'WITH', 'WOKE', 'WOLF', 'WOOD', 'WOOL', 'WORD', 'WORE', 'WORK', 'WORM', 'WORN', 'WRAP', 'YARD', 'YEAR', 'YOGA', 'ZERO', 'ZONE',
  // 5 letters
  'ABOUT', 'ABOVE', 'ACTOR', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN', 'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIEN', 'ALIGN', 'ALIKE', 'ALIVE', 'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'AMONG', 'ANGEL', 'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ARMOR', 'ARROW', 'ASIDE', 'ASSET', 'AVOID', 'AWARD', 'AWARE', 'AWFUL', 'BASIC', 'BEACH', 'BEGAN', 'BEGIN', 'BEING', 'BELOW', 'BENCH', 'BIRTH', 'BLACK', 'BLADE', 'BLAME', 'BLANK', 'BLAST', 'BLEED', 'BLEND', 'BLESS', 'BLIND', 'BLOCK', 'BLOOD', 'BLOOM', 'BLOWN', 'BOARD', 'BOOST', 'BOOTH', 'BOUND', 'BRAIN', 'BRAND', 'BRAVE', 'BREAD', 'BREAK', 'BREED', 'BRICK', 'BRIDE', 'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BROWN', 'BRUSH', 'BUILD', 'BUILT', 'BURST', 'BUYER', 'CABIN', 'CABLE', 'CANAL', 'CANDY', 'CARGO', 'CARRY', 'CATCH', 'CAUSE', 'CEASE', 'CHAIN', 'CHAIR', 'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHEEK', 'CHEER', 'CHEST', 'CHIEF', 'CHILD', 'CIVIL', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR', 'CLERK', 'CLICK', 'CLIFF', 'CLIMB', 'CLOCK', 'CLOSE', 'CLOTH', 'CLOUD', 'COACH', 'COAST', 'COULD', 'COUNT', 'COURT', 'COVER', 'CRACK', 'CRAFT', 'CRANE', 'CRASH', 'CRAZY', 'CREAM', 'CREPT', 'CRIME', 'CRISP', 'CROSS', 'CROWD', 'CROWN', 'CRUSH', 'CURVE', 'CYCLE', 'DAILY', 'DANCE', 'DEATH', 'DEBUT', 'DELAY', 'DELTA', 'DENSE', 'DEPTH', 'DOUBT', 'DRAFT', 'DRAIN', 'DRAMA', 'DRANK', 'DRAWN', 'DREAM', 'DRESS', 'DRIFT', 'DRINK', 'DRIVE', 'DROVE', 'DYING', 'EAGER', 'EARLY', 'EARTH', 'EIGHT', 'ELITE', 'EMPTY', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR', 'EVENT', 'EVERY', 'EXACT', 'EXIST', 'EXTRA', 'FAINT', 'FAITH', 'FALSE', 'FAULT', 'FIBER', 'FIELD', 'FIFTH', 'FIFTY', 'FIGHT', 'FINAL', 'FIRST', 'FLAME', 'FLASH', 'FLEET', 'FLESH', 'FLOAT', 'FLOOD', 'FLOOR', 'FLOUR', 'FLUID', 'FOCUS', 'FORCE', 'FORTH', 'FORTY', 'FORUM', 'FOUND', 'FRAME', 'FRAUD', 'FRESH', 'FRONT', 'FRUIT', 'FULLY', 'GIANT', 'GIVEN', 'GLASS', 'GLOBE', 'GLORY', 'GOING', 'GRACE', 'GRADE', 'GRAIN', 'GRAND', 'GRANT', 'GRASS', 'GRAVE', 'GREAT', 'GREEN', 'GREET', 'GRIEF', 'GROSS', 'GROUP', 'GROWN', 'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'HABIT', 'HAPPY', 'HARSH', 'HEART', 'HEAVY', 'HENCE', 'HONOR', 'HORSE', 'HOTEL', 'HOUSE', 'HUMAN', 'IDEAL', 'IMAGE', 'INDEX', 'INNER', 'INPUT', 'ISSUE', 'JEANS', 'JOINT', 'JUDGE', 'JUICE', 'KNIFE', 'KNOWN', 'LABEL', 'LABOR', 'LARGE', 'LASER', 'LATER', 'LAUGH', 'LAYER', 'LEARN', 'LEASE', 'LEAST', 'LEAVE', 'LEGAL', 'LEMON', 'LEVEL', 'LIGHT', 'LIMIT', 'LOCAL', 'LOGIC', 'LOOSE', 'LOWER', 'LUCKY', 'LUNCH', 'MAGIC', 'MAJOR', 'MAKER', 'MARCH', 'MATCH', 'MAYBE', 'MAYOR', 'MEANT', 'MEDAL', 'MEDIA', 'METAL', 'MIGHT', 'MINOR', 'MODEL', 'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVIE', 'MUSIC', 'NAKED', 'NERVE', 'NEVER', 'NEWLY', 'NIGHT', 'NOBLE', 'NOISE', 'NORTH', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER', 'OFTEN', 'ORDER', 'OTHER', 'OUGHT', 'PAINT', 'PANEL', 'PAPER', 'PARTY', 'PEACE', 'PHASE', 'PHONE', 'PHOTO', 'PIECE', 'PILOT', 'PITCH', 'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE', 'POINT', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROOF', 'PROUD', 'PROVE', 'QUEEN', 'QUICK', 'QUIET', 'QUITE', 'RADIO', 'RAISE', 'RANGE', 'RAPID', 'RATIO', 'REACH', 'REACT', 'READY', 'REALM', 'REBEL', 'REFER', 'RELAX', 'RIDER', 'RIDGE', 'RIGHT', 'RIVAL', 'RIVER', 'ROBIN', 'ROBOT', 'ROUND', 'ROUTE', 'ROYAL', 'RUGBY', 'RULER', 'RURAL', 'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SENSE', 'SERVE', 'SEVEN', 'SHADE', 'SHAFT', 'SHAKE', 'SHALL', 'SHAME', 'SHAPE', 'SHARE', 'SHARP', 'SHEEP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHINE', 'SHIRT', 'SHOCK', 'SHOOT', 'SHORE', 'SHORT', 'SHOUT', 'SIGHT', 'SKILL', 'SLEEP', 'SLIDE', 'SMALL', 'SMART', 'SMILE', 'SMOKE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPEAK', 'SPEED', 'SPEND', 'SPENT', 'SPLIT', 'SPOKE', 'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND', 'STARE', 'START', 'STATE', 'STEAM', 'STEEL', 'STEEP', 'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD', 'STORM', 'STORY', 'STRIP', 'STUDY', 'STUFF', 'STYLE', 'SUGAR', 'SUITE', 'SUPER', 'SWEET', 'TABLE', 'TAKEN', 'TASTE', 'TEACH', 'TEETH', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK', 'THING', 'THINK', 'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'TIGHT', 'TIMES', 'TIRED', 'TITLE', 'TODAY', 'TOOTH', 'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIN', 'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRUCK', 'TRULY', 'TRUTH', 'TWICE', 'UNDER', 'UNION', 'UNITY', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USUAL', 'VALID', 'VALUE', 'VIDEO', 'VIRUS', 'VISIT', 'VITAL', 'VOICE', 'WASTE', 'WATCH', 'WATER', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WOMAN', 'WOMEN', 'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WOUND', 'WRITE', 'WRONG', 'YIELD', 'YOUNG', 'YOUTH',
  // 6+ letters common
  'ACTION', 'ANIMAL', 'ANSWER', 'BEAUTY', 'BETTER', 'BORDER', 'BOTTLE', 'BRANCH', 'BREATH', 'BRIDGE', 'BRIGHT', 'BROTHER', 'CASTLE', 'CHANCE', 'CHANGE', 'CHURCH', 'CIRCLE', 'CORNER', 'COUPLE', 'COURSE', 'COUSIN', 'DANGER', 'DEGREE', 'DINNER', 'DOCTOR', 'DOLLAR', 'DOUBLE', 'DRAGON', 'DREAMT', 'EFFORT', 'ENGINE', 'FAMILY', 'FAMOUS', 'FARMER', 'FATHER', 'FEMALE', 'FINGER', 'FLOWER', 'FOREST', 'FRIEND', 'FUTURE', 'GARDEN', 'GENTLE', 'GROUND', 'GROWTH', 'HEALTH', 'HEIGHT', 'HELMET', 'HIDDEN', 'HONEST', 'HUNGER', 'HUNTER', 'ISLAND', 'JACKET', 'JUNGLE', 'LEADER', 'LENGTH', 'LETTER', 'LITTLE', 'MARKET', 'MASTER', 'MEMBER', 'MEMORY', 'MIDDLE', 'MINUTE', 'MIRROR', 'MODERN', 'MONKEY', 'MOTHER', 'MOTION', 'NATION', 'NATURE', 'NOTICE', 'NUMBER', 'OFFICE', 'ORANGE', 'PALACE', 'PARENT', 'PERSON', 'PLANET', 'POCKET', 'PRISON', 'PUBLIC', 'PURPLE', 'REASON', 'RECORD', 'REPORT', 'RESCUE', 'RIVER', 'SAFETY', 'SCHOOL', 'SEARCH', 'SEASON', 'SECOND', 'SECRET', 'SHADOW', 'SILVER', 'SIMPLE', 'SISTER', 'SPRING', 'SQUARE', 'STREET', 'STRONG', 'SUMMER', 'TARGET', 'TEMPLE', 'TRAVEL', 'VALLEY', 'VICTIM', 'VOYAGE', 'WINTER', 'WONDER', 'YELLOW',
];

const dictSet = new Set(COMMON_DICTIONARY.map(w => w.toUpperCase()));

/** 10 Curated 4x4 Boards designed for rich word connectivity */
const DAILY_BOARDS: string[][][] = [
  // Day 1
  [
    ['R', 'E', 'A', 'D'],
    ['S', 'T', 'O', 'P'],
    ['L', 'I', 'N', 'E'],
    ['F', 'A', 'S', 'T'],
  ],
  // Day 2
  [
    ['P', 'L', 'A', 'Y'],
    ['G', 'A', 'M', 'E'],
    ['T', 'E', 'A', 'M'],
    ['W', 'I', 'N', 'S'],
  ],
  // Day 3
  [
    ['B', 'E', 'A', 'R'],
    ['L', 'I', 'O', 'N'],
    ['D', 'O', 'G', 'S'],
    ['C', 'A', 'T', 'E'],
  ],
  // Day 4
  [
    ['S', 'T', 'A', 'R'],
    ['M', 'O', 'O', 'N'],
    ['G', 'L', 'O', 'W'],
    ['D', 'A', 'R', 'K'],
  ],
  // Day 5
  [
    ['W', 'A', 'T', 'E'],
    ['R', 'I', 'V', 'R'],
    ['B', 'O', 'A', 'T'],
    ['S', 'A', 'I', 'L'],
  ],
  // Day 6
  [
    ['H', 'O', 'M', 'E'],
    ['S', 'W', 'E', 'T'],
    ['L', 'O', 'V', 'E'],
    ['C', 'A', 'R', 'E'],
  ],
  // Day 7
  [
    ['F', 'I', 'R', 'E'],
    ['W', 'A', 'R', 'M'],
    ['C', 'O', 'O', 'L'],
    ['B', 'L', 'U', 'E'],
  ],
  // Day 8
  [
    ['S', 'M', 'I', 'L'],
    ['E', 'H', 'A', 'P'],
    ['P', 'Y', 'F', 'U'],
    ['N', 'J', 'O', 'Y'],
  ],
  // Day 9
  [
    ['T', 'R', 'A', 'I'],
    ['N', 'T', 'R', 'P'],
    ['R', 'O', 'A', 'D'],
    ['W', 'A', 'L', 'K'],
  ],
  // Day 10
  [
    ['H', 'E', 'A', 'R'],
    ['T', 'S', 'O', 'U'],
    ['L', 'I', 'F', 'E'],
    ['T', 'O', 'G', 'E'],
  ],
];

/** Check if two coordinates are adjacent (horiz, vert, diag) and not identical */
export function areAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  return (dr <= 1 && dc <= 1) && !(dr === 0 && dc === 0);
}

/** Check if a coordinate path is valid and without duplicate cells */
export function isValidPath(path: [number, number][]): boolean {
  if (path.length === 0) return false;
  const visited = new Set<string>();

  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    if (r < 0 || r >= 4 || c < 0 || c >= 4) return false;
    const key = `${r},${c}`;
    if (visited.has(key)) return false; // No cell reuse
    visited.add(key);

    if (i > 0) {
      const [pr, pc] = path[i - 1];
      if (!areAdjacent(pr, pc, r, c)) return false;
    }
  }
  return true;
}

/** Find all valid words that can be formed on a given 4x4 grid */
export function findAllWordsOnGrid(grid: string[][]): string[] {
  const foundWords = new Set<string>();
  const rows = 4;
  const cols = 4;

  const dfs = (r: number, c: number, currentWord: string, visited: boolean[][]) => {
    if (currentWord.length >= 3 && dictSet.has(currentWord)) {
      foundWords.add(currentWord);
    }
    if (currentWord.length >= 8) return; // limit depth for responsiveness

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
          visited[nr][nc] = true;
          dfs(nr, nc, currentWord + grid[nr][nc], visited);
          visited[nr][nc] = false;
        }
      }
    }
  };

  const visited: boolean[][] = Array.from({ length: 4 }, () => Array(4).fill(false));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      visited[r][c] = true;
      dfs(r, c, grid[r][c], visited);
      visited[r][c] = false;
    }
  }

  return Array.from(foundWords);
}

/** Get the deterministic word grid for a given day (1-10) */
export function getWordGridForDay(dayNumber: number): {
  letters: string[][];
  validWords: string[];
} {
  const index = Math.max(0, Math.min(DAILY_BOARDS.length - 1, (dayNumber - 1) % DAILY_BOARDS.length));
  const letters = DAILY_BOARDS[index];
  const validWords = findAllWordsOnGrid(letters);
  return { letters, validWords };
}

/** Check if a word is in the dictionary */
export function isDictionaryWord(word: string): boolean {
  return dictSet.has(word.toUpperCase());
}
