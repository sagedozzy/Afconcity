/* ===================== 05 language: English or Kiswahili for the menus, panels, questions, wardrobe, challenges and HUD ===================== */
/* The page is written in English. In Kiswahili, every text node and label that matches the dictionary (or one of the patterns
   for strings with numbers in them) is swapped in place, and new ones are swapped as the game adds them. The English is kept,
   so switching back restores it. Characters' dialogue and most tips stay in English for now. */
const LANG_KEY = 'afc-lang';
let LANG = (() => { try { const v = localStorage.getItem(LANG_KEY); if (v === 'en' || v === 'sw') return v; } catch (e) {} return /^sw\b/i.test(navigator.language || '') ? 'sw' : 'en'; })();
const SW = new Map(Object.entries({
  // main screen v2
  "The game": "Mchezo",
  "Touch controls": "Vidhibiti vya kugusa",
  "Watch": "Tahadhari",
  "Then": "Kisha",
  "Collect 11 Fan Passport stamps and TSh 1,000,000 for a VIP ticket to the AFCON 2027 match.": "Kusanya mihuri 11 ya Pasipoti ya Shabiki na TSh 1,000,000 kwa tiketi ya VIP ya mechi ya AFCON 2027.",
  "Eat, sleep in your room, pay rent on Saturdays. Keep savings on Pesa: pickpockets only take cash.": "Kula, lala chumbani kwako, lipa kodi kila Jumamosi. Weka akiba kwenye Pesa: wezi wa mfukoni huchukua pesa taslimu tu.",
  "Real prices, fines and clinic bills. Knock people down and the police come after you.": "Bei halisi, faini na bili za kliniki. Ukiwagonga watu, polisi watakufuata.",
  "Your ticket opens The Summit and Pitch Day. Then build businesses and buy your own wheels.": "Tiketi yako inafungua The Summit na Pitch Day. Kisha jenga biashara na ununue usafiri wako.",
  "Lock it in": "Lifunge",
  "Send your link": "Tuma kiungo chako",
  "Your friend plays 5 minutes": "Rafiki yako acheze dakika 5",
  "You both get paid": "Wote mnalipwa",
  "for you and for every friend who joins": "kwako na kwa kila rafiki anayejiunga",
  "Share": "Shiriki",
  "Getting your link…": "Tunapata kiungo chako…",
  "Volume": "Kiwango cha sauti",
  "Look speed": "Kasi ya kuangalia",
  "Screen shake": "Mtikisiko wa skrini",
  "Names above heads": "Majina juu ya vichwa",
  "Chat bubbles": "Viputo vya gumzo",
  "See spaces and prices": "Angalia nafasi na bei",
  "roadside billboards on Fumba Road": "mabango ya barabarani Fumba Road",
  "ad spaces on every player's phone": "nafasi za matangazo kwenye simu ya kila mchezaji",
  "radio spot at the beach bar": "tangazo la redio kwenye baa ya ufukweni",
  "Real today": "Halisi leo",
  "Planned (imagined designs)": "Mipango (michoro ya kubuni)",
  "Real": "Halisi",
  "Planned": "Mipango",
  "‹ Back": "‹ Rudi",
  // HUD and on-screen buttons
  'Goal': 'Lengo', 'Talk to Amina': 'Ongea na Amina', 'She is waiting on the beach.': 'Anakusubiri ufukweni.',
  'Fan Passport': 'Pasipoti ya Shabiki', 'VIP ticket fund': 'Akiba ya tiketi ya VIP', 'TIME': 'SAA', 'Connecting…': 'Inaunganisha…',
  'Map': 'Ramani', 'Phone': 'Simu', 'Menu': 'Menyu', 'Fans in Fumba': 'Mashabiki Fumba',
  'Share this game from Claude with friends who have Claude accounts to play together.': 'Shiriki mchezo huu kutoka Claude na marafiki wenye akaunti za Claude ili mcheze pamoja.',
  'Coin rush': 'Mbio za sarafu', 'Lose them, or stop and pay': 'Wakwepe, au simama ulipe', 'Mvua · wet roads': 'Mvua · barabara zinateleza',
  'Fresh': 'Mchangamfu', 'Show HUD': 'Onyesha HUD', 'Send': 'Tuma', 'Press': 'Bonyeza', 'to chat': 'kuandika ujumbe',
  'Health': 'Afya', 'Stamina': 'Pumzi', 'Food': 'Chakula', 'Energy': 'Nishati',
  'High-five': 'Gonga tano', 'Talk': 'Ongea', 'Chat': 'Soga', 'Jump': 'Ruka', 'Run': 'Kimbia',
  'Penalty bet': 'Dau la penalti', 'Shoot when the ball is near a post': 'Piga mpira ukiwa karibu na nguzo', 'Shoot': 'Piga',
  'Home': 'Nyumbani', 'Monday': 'Jumatatu',
  // start screen
  'Fumba Hustle · Live': 'Fumba Hustle · Mubashara', 'Play': 'Cheza', 'Start in Fumba': 'Anza Fumba',
  'Wardrobe': 'Kabati la nguo', 'Island looks': 'Mitindo ya kisiwani', 'How to play': 'Jinsi ya kucheza', 'Earn, spend, lose': 'Pata, tumia, poteza',
  'Play with friends': 'Cheza na marafiki', 'Checking…': 'Inakagua…', 'Settings': 'Mipangilio', 'Graphics · sound': 'Picha · sauti',
  'Advertise': 'Tangaza', 'Billboards and phones': 'Mabango na simu', 'About the map': 'Kuhusu ramani', 'Real Fumba data': 'Data halisi ya Fumba',
  'Install the app': 'Sakinisha programu', 'Play from your home screen': 'Cheza kutoka skrini yako ya mwanzo', 'Advertise with us': 'Tangaza nasi',
  'Privacy': 'Faragha', 'Terms': 'Masharti', 'Road to AFCON 2027': 'Safari ya AFCON 2027', 'VIP or bust': 'VIP au hakuna',
  'TSh in your pocket': 'TSh mfukoni mwako', 'TSh for a VIP ticket': 'TSh za tiketi ya VIP', 'passport stamps to earn': 'mihuri ya pasipoti ya kupata',
  'Your fan name': 'Jina lako la shabiki', 'Your look': 'Mtindo wako', 'Have a save code? Carry on from another phone': 'Una msimbo wa kuhifadhi? Endelea kutoka simu nyingine',
  'Load': 'Pakia', 'Loading Fumba…': 'Inapakia Fumba…', 'New game': 'Mchezo mpya',
  'Island wardrobe': 'Kabati la kisiwani', 'Dress for Fumba': 'Vaa kwa ajili ya Fumba', 'Done · back to Play': 'Tayari · rudi Cheza',
  'Hustle, then kickoff': 'Pambana, kisha mechi ianze', 'Stamp': 'Muhuri',
  'Fill your Fan Passport with 11 things people do on Zanzibar: ride a daladala, eat Zanzibar pizza, learn Swahili, a spice farm tour, seaweed farming, a sunset dhow, kanga and henna, and more.': 'Jaza Pasipoti yako ya Shabiki kwa mambo 11 ambayo watu hufanya Zanzibar: panda daladala, kula pizza ya Zanzibar, jifunze Kiswahili, ziara ya shamba la viungo, kilimo cha mwani, safari ya jahazi wakati wa machweo, kanga na hina, na mengine.',
  'Earn': 'Pata pesa',
  'Guide a walking tour for Hassan, wash cars for Fundi Rashid, carry tomato crates for Bi Mwajuma, run errands for anyone on the street (say hello with E and ask "Una kazi?"), drive a daladala route for Mzee Omari, fish off the pier, harvest seaweed by the kilo, beat the kids at beach football, cement shifts, volunteer stipends, madafu trading, bajaji fares and races, pizza runs, penalty bets and the coin rush.': 'Ongoza ziara ya matembezi kwa Hassan, osha magari kwa Fundi Rashid, beba kreti za nyanya kwa Bi Mwajuma, tumwa na mtu yeyote mtaani (salimia kwa E na uulize "Una kazi?"), endesha daladala kwa Mzee Omari, vua samaki gatini, vuna mwani kwa kilo, washinde watoto mpira wa ufukweni, zamu za saruji, posho za kujitolea, biashara ya madafu, nauli na mbio za bajaji, kupeleka pizza, dau za penalti na mbio za sarafu.',
  'You start with a chumba (room) behind the daladala depot, rent paid for the first week. Sleep there to restore energy, shower, cook and change clothes. Rent is due every Jumamosi from Pesa; move up to an Uptown studio or a Burj sea-view flat. Your phone (P) orders a boda, bajaji or private daladala that drives to wherever you are, plus food delivery and jobs.': 'Unaanza na chumba nyuma ya kituo cha daladala, kodi ya wiki ya kwanza imeshalipwa. Lala hapo kurudisha nishati, oga, pika na ubadili nguo. Kodi inadaiwa kila Jumamosi kutoka Pesa; hamia studio ya Uptown au fleti ya Burj inayotazama bahari. Simu yako (P) inaagiza boda, bajaji au daladala binafsi inayokufuata popote ulipo, pamoja na chakula na kazi.',
  'Live': 'Ishi',
  "Eat before you get hungry, keep savings on Pesa where pickpockets can't reach them (street stalls want cash), bargain at the market, and brake early when the rain comes. Knock people down and the police come after you.": 'Kula kabla njaa haijakushika, weka akiba kwenye Pesa ambako wezi wa mfukoni hawaifikii (vibanda vya mtaani vinataka pesa taslimu), pigana bei sokoni, na funga breki mapema mvua ikinyesha. Ukiwagonga watu, polisi watakufuata.',
  'Lose': 'Poteza',
  'Real prices: daladala TSh 700, Zanzibar pizza TSh 4,000, a TSh 30,000 speeding fine, clinic bills, pickpockets in red caps and cash dropped when traffic knocks you down.': 'Bei halisi: daladala TSh 700, pizza ya Zanzibar TSh 4,000, faini ya mwendo kasi TSh 30,000, bili za kliniki, wezi wa mfukoni wenye kofia nyekundu na pesa zinazodondoka gari likikugonga.',
  'Move or drive': 'Tembea au endesha', 'Mouse': 'Kipanya', 'Look (click the game first)': 'Angalia (bofya mchezo kwanza)', 'Sprint': 'Kimbia kwa kasi',
  'Jump or handbrake': 'Ruka au breki ya mkono', 'Talk, buy, ride': 'Ongea, nunua, panda', 'Shoot the ball, tackle, high-five': 'Piga mpira, kaba, gonga tano',
  'Phone: rides, food, jobs, Pesa': 'Simu: usafiri, chakula, kazi, Pesa', 'Hide or show the on-screen display': 'Ficha au onyesha maelezo ya skrini',
  'Horn': 'Honi', 'Pause menu': 'Menyu ya kusimamisha', 'Wave, dance, cheer': 'Punga mkono, cheza, shangilia',
  'Left thumb: joystick to walk or drive. Right thumb: drag the screen to look. Buttons: E to talk, buy and ride, Jump, Run, Chat. Top right: Phone, HUD (hide the display) and Menu.': 'Kidole gumba cha kushoto: kijiti cha kutembea au kuendesha. Kidole gumba cha kulia: buruta skrini kuangalia. Vitufe: E kuongea, kununua na kupanda, Ruka, Kimbia, Soga. Juu kulia: Simu, HUD (ficha maelezo) na Menyu.',
  'Multiplayer': 'Wachezaji wengi', 'Checking for other fans…': 'Inatafuta mashabiki wengine…',
  'Multiplayer is coming soon: chat, high-fives, races and dropped cash with friends in the same Fumba streets. For now, explore, work and collect your stamps solo.': 'Wachezaji wengi wanakuja hivi karibuni: soga, kugonga tano, mbio na pesa zilizodondoka pamoja na marafiki katika mitaa ileile ya Fumba. Kwa sasa, tembea, fanya kazi na kusanya mihuri yako peke yako.',
  'The host opens this game in Claude, presses': 'Mwenyeji anafungua mchezo huu ndani ya Claude, anabonyeza', 'and': 'na',
  'adds each friend by email': 'anaongeza kila rafiki kwa barua pepe', '. Sending the link alone is not enough.': '. Kutuma kiungo pekee hakutoshi.',
  'Each friend signs in to Claude with that email, then opens the link.': 'Kila rafiki anaingia Claude kwa barua pepe hiyo, kisha anafungua kiungo.',
  "They appear in Fumba with you: chat, high-fives, races, dropped cash, and each other's passport stamps.": 'Wanaonekana Fumba pamoja nawe: soga, kugonga tano, mbio, pesa zilizodondoka, na mihuri ya pasipoti ya kila mmoja.',
  'To check it works on your own, open the game in a second browser tab: your other tab appears as a second fan.': 'Kujaribu mwenyewe, fungua mchezo kwenye kichupo cha pili cha kivinjari: kichupo chako kingine kinaonekana kama shabiki wa pili.',
  'Your setup': 'Mipangilio yako', 'Graphics': 'Picha', 'High': 'Bora', 'Fast': 'Haraka', 'Sound': 'Sauti', 'On': 'Washa', 'Off': 'Zima',
  'Camera follow': 'Kamera ifuate', 'On-screen display': 'Maelezo ya skrini', 'Full': 'Kamili', 'Minimal': 'Kidogo',
  'Fast graphics turns off soft shadows and lowers the resolution for phones and older laptops.': 'Picha za Haraka zinazima vivuli laini na kupunguza ubora kwa simu na kompyuta za zamani.',
  'For brands': 'Kwa makampuni', 'Your billboard in AfconCity': 'Bango lako ndani ya AfconCity', 'On your phone': 'Kwenye simu yako', 'Install AfconCity': 'Sakinisha AfconCity',
  'Add the game to your home screen: it opens full screen like an app, and after the first visit it starts fast, even on a weak connection.': 'Weka mchezo kwenye skrini yako ya mwanzo: unafunguka skrini nzima kama programu, na baada ya mara ya kwanza unaanza haraka, hata mtandao ukiwa dhaifu.',
  'In Safari, tap the': 'Kwenye Safari, gusa kitufe cha', 'button (the square with an arrow).': '(mraba wenye mshale).', 'Scroll down and tap': 'Shuka chini kisha gusa',
  ', then': ', kisha', 'Open the browser menu (': 'Fungua menyu ya kivinjari (', 'in Chrome).': 'kwenye Chrome).', 'Tap': 'Gusa', 'or': 'au',
  'AfconCity is installed. Open it from your home screen.': 'AfconCity imesakinishwa. Ifungue kutoka skrini yako ya mwanzo.',
  'About': 'Kuhusu', "Real Fumba, tomorrow's plans": 'Fumba halisi, mipango ya kesho',
  'Streets, coastline, land cover and building outlines are real: OpenStreetMap contributors (ODbL) and Google Open Buildings (CC BY 4.0), via Overture Maps. AfconCity sits on the real Zanzibar Sports City site beside the Fumba road.': 'Mitaa, ufukwe, matumizi ya ardhi na michoro ya majengo ni halisi: wachangiaji wa OpenStreetMap (ODbL) na Google Open Buildings (CC BY 4.0), kupitia Overture Maps. AfconCity iko kwenye eneo halisi la Zanzibar Sports City kando ya barabara ya Fumba.',
  'The empty plots hold projects from public plans for Greater Fumba and the Fumba Economic Zone: the Continental Mall of Zanzibar, Burj Zanzibar, the IIT Madras campus, a 400-bed hotel, a medical tourism hospital, ZHC housing towers, a basketball centre, a film studio, a four-lane highway and a ferry pier. Their designs and exact spots are imagined.': 'Viwanja vitupu vina miradi kutoka mipango ya umma ya Greater Fumba na Fumba Economic Zone: Continental Mall of Zanzibar, Burj Zanzibar, kampasi ya IIT Madras, hoteli ya vitanda 400, hospitali ya utalii wa matibabu, minara ya makazi ya ZHC, kituo cha mpira wa kikapu, studio ya filamu, barabara kuu ya njia nne na gati la feri. Miundo yao na maeneo yao halisi ni ya kubuni.',
  'Prices follow 2026 Zanzibar rates (daladala TSh 700, about TSh 2,600 to the US dollar). All money is in-game only. Independent prototype, not affiliated with CAF, the Revolutionary Government of Zanzibar or any developer named.': 'Bei zinafuata viwango vya Zanzibar vya 2026 (daladala TSh 700, takriban TSh 2,600 kwa dola ya Marekani). Pesa zote ni za ndani ya mchezo tu. Mfano huru, hauhusiani na CAF, Serikali ya Mapinduzi ya Zanzibar wala mwekezaji yeyote aliyetajwa.',
  // the VIP ending
  'Walk away': 'Ondoka', 'VIP stand · AfconCity Stadium': 'Jukwaa la VIP · Uwanja wa AfconCity', 'Karibu VIP. You made it to AFCON': 'Karibu VIP. Umefika AFCON',
  'Cash left': 'Pesa iliyobaki', 'Earned': 'Ulichopata', 'Lost or spent': 'Kilichopotea au kutumika', 'Time played': 'Muda wa kucheza',
  'Partner rewards unlocked': 'Zawadi za washirika zimefunguliwa', 'Airport transfer, 10% off': 'Usafiri wa uwanja wa ndege, punguzo la 10%', 'Sample partner': 'Mshirika wa mfano',
  'Fan Village late checkout': 'Kuondoka kwa kuchelewa Fan Village', 'Free Zanzibar pizza on matchday': 'Pizza ya Zanzibar bure siku ya mechi',
  'Placeholders for where partner offers would sit in the commercial version.': 'Nafasi za mfano za ofa za washirika katika toleo la kibiashara.', 'Keep hustling': 'Endelea kupambana',
  // pause menu
  'Paused': 'Umesimama', 'Solo': 'Peke yako', 'Passport': 'Pasipoti', 'Stats': 'Takwimu', 'Friends': 'Marafiki', 'Leaders': 'Viongozi',
  'Billboards': 'Mabango', 'Feedback': 'Maoni', 'Controls': 'Vidhibiti',
  'Multiplayer is coming soon. For now, Fumba is all yours.': 'Wachezaji wengi wanakuja hivi karibuni. Kwa sasa, Fumba ni yako peke yako.',
  'and adds each friend by email.': 'na anaongeza kila rafiki kwa barua pepe.', 'Friends sign in to Claude with that email and open the link.': 'Marafiki wanaingia Claude kwa barua pepe hiyo na kufungua kiungo.',
  'They appear here and in the streets, live. Open a second tab to test it yourself.': 'Wanaonekana hapa na mitaani, mubashara. Fungua kichupo cha pili kujaribu mwenyewe.',
  'Time of day': 'Wakati wa siku', 'Live clock': 'Saa halisi', 'Day': 'Mchana', 'Night': 'Usiku', 'Mouse sensitivity': 'Unyeti wa kipanya', 'Cloud save': 'Hifadhi mtandaoni',
  'in the game to cycle Full, Minimal and Off. The live clock runs a day in about 19 minutes. Progress saves in this browser, and on afconcity.com it is also backed up online with your save code.': 'ndani ya mchezo kubadili Kamili, Kidogo na Zima. Saa halisi inamaliza siku moja kwa takriban dakika 19. Maendeleo yanahifadhiwa kwenye kivinjari hiki, na kwenye afconcity.com pia yanahifadhiwa mtandaoni kwa msimbo wako wa kuhifadhi.',
  'On a phone: joystick bottom-left, drag anywhere to look, buttons bottom-right.': 'Kwenye simu: kijiti chini kushoto, buruta popote kuangalia, vitufe chini kulia.',
  'Resume': 'Endelea', "I'm stuck": 'Nimekwama',
  // labels read by screen readers and tooltips
  '3D view of Fumba Uptown, Zanzibar': 'Mwonekano wa 3D wa Fumba Uptown, Zanzibar', 'Game time: rent is due every Jumamosi (Saturday) at 10:00': 'Saa ya mchezo: kodi inadaiwa kila Jumamosi saa 10:00',
  'Money on your phone: pickpockets cannot take it': 'Pesa kwenye simu yako: wezi wa mfukoni hawawezi kuichukua', 'Phone (P)': 'Simu (P)',
  'Change the on-screen display (H)': 'Badilisha maelezo ya skrini (H)', 'Fans online': 'Mashabiki mtandaoni', 'Show the on-screen display (H)': 'Onyesha maelezo ya skrini (H)',
  'Message everyone in Fumba…': 'Mtumie kila mtu Fumba ujumbe…', 'Chat message': 'Ujumbe wa soga', 'Quick phrases': 'Maneno ya haraka',
  'Radar. Click for the full map.': 'Rada. Bofya kuona ramani nzima.', 'Health: rest or visit the Kliniki to refill': 'Afya: pumzika au nenda Kliniki kujaza',
  'Stamina: used when you run, refills when you walk': 'Pumzi: inatumika ukikimbia, inajaa ukitembea', 'Food: eat to refill': 'Chakula: kula kujaza',
  'Energy: sleep at home to refill': 'Nishati: lala nyumbani kujaza', 'Your phone': 'Simu yako', 'Back': 'Rudi', 'Home screen': 'Skrini ya mwanzo',
  'Put the phone away': 'Weka simu mbali', 'Your home': 'Nyumbani kwako', 'Main menu': 'Menyu kuu', 'Save code': 'Msimbo wa kuhifadhi', 'Shop': 'Duka',
  'Map of Fumba Uptown and AfconCity with your position and places': 'Ramani ya Fumba Uptown na AfconCity, ulipo na maeneo', 'Zoom in': 'Kuza', 'Zoom out': 'Punguza',
  'Centre on me': 'Nionyeshe nilipo', 'Show on screen': 'Onyesha kwenye skrini',
  // welcome questions
  'Karibu Fumba': 'Karibu Fumba', 'Fill your purse': 'Jaza pochi yako', 'Starting purse': 'Pochi ya kuanzia', 'Skip': 'Ruka', 'Twende · Play': 'Twende · Cheza',
  'Hongera! All answered': 'Hongera! Umejibu yote', 'How we use them': 'Jinsi tunavyoyatumia',
  'Answers are anonymous: no names, numbers or contact details. They help us plan events, matches and new features.': 'Majibu hayana majina: hakuna majina, namba wala mawasiliano. Yanatusaidia kupanga matukio, mechi na vipengele vipya.',
  'TSh you have now': 'TSh ulizonazo sasa', 'TSh in your starting purse': 'TSh kwenye pochi yako ya kuanzia', 'TSh to start: answer 8 quick questions': 'TSh za kuanzia: jibu maswali 8 mafupi',
  'Where are you playing from?': 'Unacheza ukiwa wapi?', 'Mainland Tanzania': 'Tanzania Bara', 'South Africa': 'Afrika Kusini', 'Elsewhere in Africa': 'Kwingineko Afrika',
  'Europe': 'Ulaya', 'The Americas': 'Amerika', 'Asia or Middle East': 'Asia au Mashariki ya Kati', 'Somewhere else': 'Kwingineko',
  'Who are you backing at AFCON 2027?': 'Unashabikia timu gani AFCON 2027?', 'South Africa · Bafana Bafana': 'Afrika Kusini · Bafana Bafana', 'Egypt · The Pharaohs': 'Misri · The Pharaohs',
  'Morocco · Atlas Lions': 'Moroko · Atlas Lions', "Côte d'Ivoire · The Elephants": "Côte d'Ivoire · Tembo", 'Another team': 'Timu nyingine',
  'Have you been to Zanzibar?': 'Umewahi kufika Zanzibar?', 'I live here': 'Ninaishi hapa', 'I have visited': 'Nimewahi kutembelea', 'Planning a trip': 'Napanga safari', 'Not yet, one day': 'Bado, siku moja',
  'Which age group are you in?': 'Uko kwenye kundi gani la umri?', 'Under 18': 'Chini ya 18', '45 or over': '45 au zaidi',
  'How much football do you watch?': 'Unatazama mpira kiasi gani?', 'Every match I can': 'Kila mechi ninayoweza', 'Most weekends': 'Wikendi nyingi', 'Big tournaments only': 'Mashindano makubwa tu', 'Hardly any': 'Karibu hata kidogo',
  'Will you go to an AFCON 2027 match?': 'Utaenda kwenye mechi ya AFCON 2027?', 'I have tickets': 'Nina tiketi', 'Planning to go': 'Napanga kwenda', 'Watching on TV': 'Nitatazama kwenye TV', 'Not sure yet': 'Bado sina uhakika',
  'How did you find AfconCity?': 'Uliijuaje AfconCity?', 'A friend': 'Rafiki',
  'What do you want most from this game?': 'Unataka nini zaidi kwenye mchezo huu?', 'Exploring Zanzibar': 'Kuzunguka Zanzibar', 'Making money': 'Kutengeneza pesa',
  'Driving and racing': 'Kuendesha na mashindano', 'Playing with friends': 'Kucheza na marafiki', 'Football': 'Mpira wa miguu', 'Fashion and homes': 'Mitindo na nyumba',
  'Playing from': 'Anacheza kutoka', 'AFCON team': 'Timu ya AFCON', 'Age group': 'Kundi la umri', 'Watches football': 'Anatazama mpira', 'AFCON 2027 match': 'Mechi ya AFCON 2027', 'Found us via': 'Alitupata kupitia', 'Wants most': 'Anataka zaidi',
  // wardrobe
  'Your own look': 'Mtindo wako mwenyewe', 'Limited-edition prints': 'Michoro ya toleo maalum', 'Man': 'Mwanamume', 'Woman': 'Mwanamke', 'Limited · yours': 'Toleo maalum · lako',
  'Top': 'Juu', 'Bottom': 'Chini', 'Shoes': 'Viatu', 'Hat': 'Kofia', 'Shades': 'Miwani', 'Hair': 'Nywele', 'Colour': 'Rangi', 'Shuffle': 'Changanya',
  'Everyone online sees your look.': 'Kila aliye mtandaoni anaona mtindo wako.',
  'White': 'Nyeupe', 'Sand': 'Mchanga', 'Terracotta': 'Udongo', 'Coral': 'Matumbawe', 'Blush': 'Waridi hafifu', 'Mustard': 'Haradali', 'Sage': 'Kijani hafifu', 'Olive': 'Zeituni',
  'Turquoise': 'Feruzi', 'Ocean': 'Bahari', 'Navy': 'Bluu iliyokolea', 'Lilac': 'Zambarau hafifu', 'Black': 'Nyeusi', 'Denim': 'Denimu', 'Stone': 'Jiwe', 'Red': 'Nyekundu',
  'Brown': 'Kahawia', 'Tan': 'Hudhurungi', 'Pink': 'Waridi', 'Gold': 'Dhahabu',
  'Football jersey': 'Jezi ya mpira', 'Resort shirt': 'Shati la likizo', 'Linen shirt': 'Shati la kitani', 'Breton top': 'Fulana ya mistari', 'T-shirt': 'Fulana',
  'Kitenge shirt': 'Shati la kitenge', 'Tank top': 'Fulana ya mikono wazi', 'Peasant blouse': 'Blauzi', 'Kaftan': 'Kaftani', 'Maxi dress': 'Gauni refu', 'Midi dress': 'Gauni la kati',
  'Kitenge gown': 'Gauni la kitenge', 'Kit shorts': 'Kaptura ya jezi', 'Kit track pants': 'Suruali ya mazoezi', 'Chino shorts': 'Kaptura ya chino', 'Swim shorts': 'Kaptura ya kuogelea',
  'Bermudas': 'Bermuda', 'Linen trousers': 'Suruali ya kitani', 'Chinos': 'Suruali ya chino', 'Jeans': 'Jinzi', 'Cropped trousers': 'Suruali fupi', 'Palazzo pants': 'Suruali pana',
  'Maxi skirt': 'Sketi ndefu', 'Midi skirt': 'Sketi ya kati', 'Sneakers': 'Raba', 'Espadrilles': 'Espadrili', 'Sandals': 'Ndala', 'Slides': 'Sapatu', 'Loafers': 'Viatu vya ngozi',
  'Short': 'Fupi', 'Braids': 'Kusuka', 'Headscarf': 'Kilemba', 'Cap': 'Kofia ya jua', 'Bald': 'Kipara', 'Top bun': 'Kishungi', 'Locs': 'Rasta',
  // daily reward and challenges
  'Daily reward': 'Zawadi ya kila siku', 'Karibu tena!': 'Karibu tena!',
  'Come back tomorrow to keep the streak: the reward grows every day for a week.': 'Rudi kesho kuendeleza mfululizo: zawadi inaongezeka kila siku kwa wiki nzima.',
  'Play on more days in a row and the daily reward grows, up to TSh 50,000 on day 7.': 'Cheza siku nyingi mfululizo na zawadi ya kila siku inaongezeka, hadi TSh 50,000 siku ya 7.',
  "Today's challenges": 'Changamoto za leo', 'New challenges every day. Finish all three for a TSh 15,000 bonus.': 'Changamoto mpya kila siku. Maliza zote tatu upate bonasi ya TSh 15,000.',
  'Catch a pickpocket': 'Mkamate mwizi wa mfukoni', 'Earn a passport stamp': 'Pata muhuri wa pasipoti', 'Run an errand for someone on the street': 'Tumwa na mtu mtaani',
  "All of today's challenges": 'Changamoto zote za leo',
  // cloud saves, leaderboards and invites
  'Copy': 'Nakili', 'Copied': 'Imenakiliwa', 'Cloud saves work when you play on afconcity.com.': 'Hifadhi ya mtandaoni inafanya kazi ukicheza kwenye afconcity.com.',
  'This save now lives on another phone. Start a new game here, or load a different code from the start screen.': 'Hifadhi hii sasa iko kwenye simu nyingine. Anza mchezo mpya hapa, au pakia msimbo mwingine kutoka skrini ya mwanzo.',
  'Your progress is backed up online a minute after you start playing. Your save code will appear here.': 'Maendeleo yako yanahifadhiwa mtandaoni dakika moja baada ya kuanza kucheza. Msimbo wako wa kuhifadhi utaonekana hapa.',
  'Save codes work on afconcity.com.': 'Misimbo ya kuhifadhi inafanya kazi kwenye afconcity.com.', 'Looking for your save…': 'Inatafuta hifadhi yako…',
  'Could not reach the server. Check your connection.': 'Imeshindwa kufikia seva. Angalia mtandao wako.', 'That code did not work.': 'Msimbo huo haukufanya kazi.',
  'That save is from a version of the game this phone cannot read.': 'Hifadhi hiyo ni ya toleo la mchezo ambalo simu hii haiwezi kusoma.',
  'Leaderboards and invites run on afconcity.com.': 'Orodha za viongozi na mialiko zinapatikana kwenye afconcity.com.', 'Loading the leaderboards…': 'Inapakia orodha za viongozi…',
  'Could not load the leaderboards. Check your connection.': 'Imeshindwa kupakia orodha za viongozi. Angalia mtandao wako.', 'Nobody yet. Be first!': 'Bado hakuna. Kuwa wa kwanza!',
  'Weekly Passport Race': 'Mbio za Pasipoti za Wiki', 'Richest fans': 'Mashabiki matajiri zaidi', 'Cash plus Pesa, right now.': 'Pesa taslimu pamoja na Pesa, sasa hivi.',
  'Fastest bajaji race': 'Mbio za bajaji za kasi zaidi', 'Best time round the Fumba race course.': 'Muda bora kwenye njia ya mbio ya Fumba.',
  'Invite friends · TSh 25,000 each': 'Alika marafiki · TSh 25,000 kila mmoja', 'Share link': 'Shiriki kiungo', 'Link copied': 'Kiungo kimenakiliwa',
  // match days
  'Live now': 'Mubashara sasa', 'Next match day': 'Siku ijayo ya mechi', 'AFCON qualifiers · matchdays 3 and 4': 'Mechi za kufuzu AFCON · raundi ya 3 na 4',
  'AFCON qualifiers · matchdays 5 and 6': 'Mechi za kufuzu AFCON · raundi ya 5 na 6', 'AFCON 2027 opening match': 'Mechi ya ufunguzi ya AFCON 2027',
  'AFCON 2027 · every match on the big screen': 'AFCON 2027 · kila mechi kwenye skrini kubwa', 'AFCON 2027 final': 'Fainali ya AFCON 2027',
  'That is the watch-party pay for this match day. Enjoy the game!': 'Hayo ndiyo malipo ya kutazama kwa siku hii ya mechi. Furahia mchezo!',
}));
const swG = (x) => { const s = swOf(x); return s == null ? x : s; };
/* strings with numbers or names in them */
const SW_RE = [
  [/^Shot (\d) of (\d)$/, (m, a, b) => `Shuti ${a} kati ya ${b}`],
  [/^Fan Passport · (\d+) of (\d+)$/, (m, a, b) => `Pasipoti ya Shabiki · ${a} kati ya ${b}`],
  [/^Goals (\d+)$/, (m, a) => `Magoli ${a}`],
  [/^You step off the daladala on Fumba Road with (up to )?(TSh [\d,]+)\. A VIP seat for the AFCON 2027 match at AfconCity costs TSh 1,000,000, and only fans with a full Fan Passport of Zanzibar experiences can buy one\. Work, explore and haggle at real Zanzibar prices\.$/, (m, up, n) => `Unashuka kwenye daladala barabara ya Fumba ukiwa na ${up ? 'hadi ' : ''}${n}. Kiti cha VIP kwa mechi ya AFCON 2027 uwanjani AfconCity kinagharimu TSh 1,000,000, na ni mashabiki wenye Pasipoti ya Shabiki iliyojaa uzoefu wa Zanzibar pekee wanaoweza kukinunua. Fanya kazi, zunguka na pigana bei kwa bei halisi za Zanzibar.`],
  [/^Every answer adds (TSh [\d,]+) to the cash you start with\. Answer all (\d+) for a (TSh [\d,]+) bonus: up to (TSh [\d,]+)\.$/, (m, a, n, b, c) => `Kila jibu linaongeza ${a} kwenye pesa za kuanzia. Jibu yote ${n} upate bonasi ya ${b}: hadi ${c}.`],
  [/^(Mgeni|Rafiki|Jirani|Mwenyeji) · .+$/, (m, a) => a],
  [/^Start with (TSh [\d,]+)$/, (m, a) => `Anza na ${a}`],
  [/^You start with (TSh [\d,]+)$/, (m, a) => `Unaanza na ${a}`],
  [/^(\d+) of (\d+) answered$/, (m, a, b) => `${a} kati ya ${b} yamejibiwa`],
  [/^That includes the (TSh [\d,]+) bonus for answering everything\. Asante sana, (.+)!$/, (m, a, b) => `Hiyo inajumuisha bonasi ya ${a} kwa kujibu yote. Asante sana, ${b}!`],
  [/^Answer the rest next time you start a new game to grow your purse to (TSh [\d,]+)\.$/, (m, a) => `Jibu yaliyobaki utakapoanza mchezo mpya ili pochi yako ifike ${a}.`],
  [/^Question (\d+) of (\d+) · \+(TSh [\d,]+)$/, (m, a, b, c) => `Swali ${a} kati ya ${b} · +${c}`],
  [/^Bonus \+(TSh [\d,]+)$/, (m, a) => `Bonasi +${a}`],
  [/^Rank up · (.+)$/, (m, a) => `Cheo kipya · ${a}`],
  [/^(\d+) to (\d+)$/, (m, a, b) => `${a} hadi ${b}`],
  [/^Limited · (TSh [\d,]+)$/, (m, a) => `Toleo maalum · ${a}`],
  [/^Skin tone (\d+)$/, (m, a) => `Rangi ya ngozi ${a}`],
  [/^You need (TSh [\d,]+) in cash or on Pesa for this\.$/, (m, a) => `Unahitaji ${a} taslimu au kwenye Pesa kwa hili.`],
  [/^Limited prints are bought with game shillings \((TSh [\d,]+)\)\. Start playing, then open the wardrobe at home or from here\.$/, (m, a) => `Michoro ya toleo maalum inanunuliwa kwa shilingi za mchezo (${a}). Anza kucheza, kisha fungua kabati la nguo nyumbani au hapa.`],
  [/^Day (\d+) in a row!$/, (m, a) => `Siku ya ${a} mfululizo!`],
  [/^Day (\d+)$/, (m, a) => `Siku ${a}`],
  [/^Day (\d+) streak$/, (m, a) => `Mfululizo wa siku ${a}`],
  [/^Collect (TSh [\d,]+)$/, (m, a) => `Chukua ${a}`],
  [/^Today's challenges · day (\d+) streak$/, (m, a) => `Changamoto za leo · mfululizo wa siku ${a}`],
  [/^Done · \+(TSh [\d,]+)$/, (m, a) => `Imekamilika · +${a}`],
  [/^Earn (TSh [\d,]+)$/, (m, a) => `Pata ${a}`],
  [/^Finish (\d+) jobs$/, (m, a) => `Maliza kazi ${a}`],
  [/^Grab (\d+) street coins$/, (m, a) => `Okota sarafu ${a} za mtaani`],
  [/^Harvest (\d+) kg of seaweed$/, (m, a) => `Vuna kilo ${a} za mwani`],
  [/^Sell (\d+) madafu on the beach$/, (m, a) => `Uza madafu ${a} ufukweni`],
  [/^Catch (\d+) fish off the pier$/, (m, a) => `Vua samaki ${a} gatini`],
  [/^Run (\d+) errands for someone on the street$/, (m, a) => `Tumwa mara ${a} na watu mtaani`],
  [/^Found it: (.+) with (TSh [\d,]+)\. Loading…$/, (m, a, b) => `Imepatikana: ${a} mwenye ${b}. Inapakia…`],
  [/^Type this code on another phone or computer \(start screen, "Have a save code\?"\) to carry on there\. Keep it private: anyone with it can load your game\.(?: Last backed up (.+)\.)?$/, (m, a) => `Andika msimbo huu kwenye simu au kompyuta nyingine (skrini ya mwanzo, "Una msimbo wa kuhifadhi?") kuendelea huko. Uweke siri: yeyote mwenye msimbo huu anaweza kupakia mchezo wako.${a ? ` Ulihifadhiwa mwisho saa ${a}.` : ''}`],
  [/^Most passport stamps this week \(Monday to Sunday\), then most shillings earned\. You: (\d+) stamps?, (TSh [\d,]+)\.$/, (m, a, b) => `Mihuri mingi zaidi ya pasipoti wiki hii (Jumatatu hadi Jumapili), kisha shilingi nyingi zaidi. Wewe: mihuri ${a}, ${b}.`],
  [/^(\d+) stamps? · (TSh [\d,]+)$/, (m, a, b) => `mihuri ${a} · ${b}`],
  [/^Send your link\. When a friend starts playing through it, you both get (TSh [\d,]+) \(up to 10 friends a week\)\.$/, (m, a) => `Tuma kiungo chako. Rafiki akianza kucheza kupitia kiungo hicho, nyote wawili mnapata ${a} (hadi marafiki 10 kwa wiki).`],
  [/^Come play AfconCity with me: real Fumba, Zanzibar in 3D\. Start with (TSh [\d,]+) extra:$/, (m, a) => `Njoo ucheze AfconCity nami: Fumba halisi, Zanzibar kwa 3D. Anza na ${a} za ziada:`],
  [/^Your friend's invite paid (TSh [\d,]+)$/, (m, a) => `Mwaliko wa rafiki yako umekulipa ${a}`],
  [/^(\d+) friends? started playing · \+(TSh [\d,]+)$/, (m, a, b) => `Marafiki ${a} wameanza kucheza · +${b}`],
  [/^(.+) · watch party at the Fan Zone$/, (m, a) => `${swG(a)} · sherehe ya kutazama Fan Zone`],
  [/^(.+) · today at (.+)$/, (m, a, b) => `${swG(a)} · leo saa ${b}`],
  [/^(.+) · in (\d+) days$/, (m, a, b) => `${swG(a)} · baada ya siku ${b}`],
  [/^(TSh [\d,]+) a minute in the Fan Zone$/, (m, a) => `${a} kwa dakika Fan Zone`],
  [/^(.+) · \+(TSh [\d,]+)$/, (m, a, b) => { const s = swOf(a); return s == null ? null : `${s} · +${b}`; }],
  [/^(.+) · (TSh [\d,]+)$/, (m, a, b) => { const s = swOf(a); return s == null ? null : `${s} · ${b}`; }],
];
const I18N = { orig: new WeakMap(), attr: new WeakMap(), cache: new Map(), obs: null };
const SW_ATTRS = ['placeholder', 'aria-label', 'title'];
const SW_SKIP = 'script,style,textarea,kbd,code,.chatlog,.ph-bub,#chatPhrases,.lb-list b,.cloud-code,[data-notr]';
function swOf(s) {
  const d = SW.get(s); if (d !== undefined) return d;
  const c = I18N.cache.get(s); if (c !== undefined) return c;
  let r = null;
  if (s.length < 600) for (const [re, f] of SW_RE) { const m = re.exec(s); if (m) { r = f(...m); if (r != null) break; } }
  if (I18N.cache.size > 4000) I18N.cache.clear();
  I18N.cache.set(s, r); return r;
}
/* for text the code builds itself (share messages and the like) */
const tr = (s) => LANG === 'sw' ? swG(String(s).trim()) : s;
function swText(n) {
  const raw = n.nodeValue, o = I18N.orig.get(n), en = o && raw === o.sw ? o.en : raw;
  if (LANG !== 'sw') { if (o) { if (raw === o.sw) n.nodeValue = o.en; I18N.orig.delete(n); } return; }
  const t = en.trim(); if (!t || !/[A-Za-z]/.test(t)) return;
  const p = n.parentElement; if (!p || p.closest(SW_SKIP)) return;
  const s = swOf(t); if (s == null) return;
  const i = en.indexOf(t), out = en.slice(0, i) + s + en.slice(i + t.length);
  I18N.orig.set(n, { en, sw: out });
  if (out !== raw) n.nodeValue = out;
}
function swAttr(e, a) {
  const raw = e.getAttribute(a); if (raw == null) return;
  const m = I18N.attr.get(e) || {}, o = m[a], en = o && raw === o.sw ? o.en : raw;
  if (LANG !== 'sw') { if (o) { if (raw === o.sw) e.setAttribute(a, o.en); delete m[a]; } return; }
  if (e.closest(SW_SKIP)) return;
  const s = swOf(en.trim()); if (s == null) return;
  m[a] = { en, sw: s }; I18N.attr.set(e, m);
  if (s !== raw) e.setAttribute(a, s);
}
function swTree(root) {
  if (root.nodeType === 3) { swText(root); return; }
  if (root.nodeType !== 1) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) swText(n);
  const els = root.querySelectorAll('[placeholder],[aria-label],[title]');
  for (const a of SW_ATTRS) if (root.hasAttribute(a)) swAttr(root, a);
  for (const e of els) for (const a of SW_ATTRS) if (e.hasAttribute(a)) swAttr(e, a);
}
function applyLang(l) {
  if (l) { LANG = l === 'sw' ? 'sw' : 'en'; try { localStorage.setItem(LANG_KEY, LANG); } catch (e) {} }
  document.documentElement.lang = LANG;
  swTree(document.body);
  document.querySelectorAll('[data-seg="lang"] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === LANG)));
  document.querySelectorAll('[data-lang-note]').forEach(p => { p.hidden = LANG !== 'sw'; });
}
function initLang() {
  I18N.obs = new MutationObserver((list) => {
    if (LANG !== 'sw') return;
    for (const r of list) {
      if (r.type === 'childList') { for (const n of r.addedNodes) swTree(n); }
      else if (r.type === 'characterData') swText(r.target);
      else if (r.type === 'attributes') swAttr(r.target, r.attributeName);
    }
  });
  I18N.obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: SW_ATTRS });
  document.querySelectorAll('[data-seg="lang"] button').forEach(b => b.addEventListener('click', () => { applyLang(b.dataset.v); if (typeof track === 'function') track('lang', { l: LANG }); }));
  applyLang();
}
initLang();
