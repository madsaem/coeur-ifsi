// Contenus de révision (IFSI, 2e année). Chaque fiche : t = titre, k = catégorie, d = résumé,
// p = points clés, i = « en pratique » (lien clinique / soins), th = thème à afficher pour la voir.

export const THEMES = [
  { id: 'coeur', name: 'Cœur', sub: 'Cavités, valves, gros vaisseaux', locked: true },
  { id: 'poumons', name: 'Poumons', sub: 'Petite circulation · hématose' },
  { id: 'cerveau', name: 'Cerveau', sub: 'Carotides · jugulaires' },
  { id: 'bras', name: 'Membres supérieurs', cap: 'Bras', sub: 'Subclavières · radiale · pli du coude' },
  { id: 'digestif', name: 'Foie & digestif', cap: 'Digestif', sub: 'Tronc cœliaque · système porte' },
  { id: 'reins', name: 'Reins', sub: 'Artères & veines rénales' },
  { id: 'jambes', name: 'Membres inférieurs', cap: 'Jambes', sub: 'Fémorales · saphènes · retour veineux' },
  { id: 'pelvis', name: 'Pelvis', sub: 'Organes génitaux · vaisseaux gonadiques' },
  { id: 'coronaires', name: 'Coronaires', cap: 'Coron.', sub: 'La circulation du cœur lui-même' },
];

export const INFO = {
  overview: {
    t: 'Le cœur en bref', k: 'Vue d’ensemble',
    d: 'Muscle creux d’environ 300 g chez l’homme et 250 g chez la femme (la taille du poing de la personne), situé dans le médiastin, entre les deux poumons, posé sur le diaphragme. Sa pointe (apex) est en bas, en avant et à gauche (5e espace intercostal gauche, ligne médio-claviculaire).',
    p: [
      '<b>Deux pompes côte à côte</b>, séparées par le septum et qui battent en même temps : le <b>cœur droit</b> envoie le sang pauvre en O₂ aux poumons, le <b>cœur gauche</b> envoie le sang riche en O₂ à tout le corps.',
      '<b>4 cavités</b> : 2 oreillettes (reçoivent le sang des veines) et 2 ventricules (éjectent le sang dans les artères).',
      '<b>4 valves</b> qui imposent un sens unique : auriculo-ventriculaires (tricuspide à droite, mitrale à gauche) et sigmoïdes (pulmonaire, aortique).',
      '<b>Paroi</b> : endocarde (couche interne) · myocarde (muscle) · péricarde (enveloppe : épicarde = feuillet viscéral, feuillet pariétal, péricarde fibreux).',
      '<b>Artère</b> = part du cœur · <b>veine</b> = revient au cœur, quelle que soit la teneur en O₂.',
    ],
    i: ['Repère du schéma : on regarde le patient de face, <b>sa droite est à gauche de l’écran</b> (comme sur une radio ou un ECG).'],
  },
  od: {
    t: 'Oreillette droite (OD)', k: 'Cavité · cœur droit', th: 'coeur',
    d: 'Reçoit le sang pauvre en O₂ de tout l’organisme et le passe au ventricule droit par la valve tricuspide.',
    p: [
      'Entrées : <b>veine cave supérieure</b> (tête, cou, bras), <b>veine cave inférieure</b> (abdomen, jambes) et <b>sinus coronaire</b> (veines du cœur).',
      'Paroi fine, basse pression (≈ 0–5 mmHg).',
      'Contient le <b>nœud sinusal</b>, le pacemaker naturel, près de l’arrivée de la VCS.',
    ],
    i: ['La <b>PVC</b> (pression veineuse centrale) correspond à la pression de l’OD : l’extrémité d’un cathéter veineux central se place à la jonction VCS–OD (contrôle radio).'],
  },
  vd: {
    t: 'Ventricule droit (VD)', k: 'Cavité · cœur droit', th: 'coeur',
    d: 'Reçoit le sang de l’OD et l’éjecte dans le tronc pulmonaire, vers les poumons.',
    p: [
      'En forme de croissant, enroulé devant le VG : il forme l’essentiel de la face antérieure du cœur.',
      'Paroi environ <b>3 fois plus fine</b> que celle du VG : la circulation pulmonaire est à basse pression (≈ 25 mmHg en systole).',
      'Entrée : valve tricuspide · sortie : valve pulmonaire.',
    ],
    i: ['<b>Insuffisance cardiaque droite</b> : le sang stagne en amont, dans les veines → turgescence jugulaire, œdèmes des membres inférieurs, hépatomégalie (reflux hépato-jugulaire).'],
  },
  og: {
    t: 'Oreillette gauche (OG)', k: 'Cavité · cœur gauche', th: 'coeur',
    d: 'Reçoit le sang riche en O₂ qui revient des poumons et le passe au ventricule gauche par la valve mitrale.',
    p: [
      'Entrées : les <b>4 veines pulmonaires</b> (2 droites, 2 gauches).',
      'Cavité la plus postérieure du cœur, au contact de l’œsophage (d’où l’échographie trans-œsophagienne).',
    ],
    i: ['En <b>fibrillation atriale</b>, les oreillettes ne se contractent plus efficacement : le sang stagne, des caillots se forment (surtout dans l’auricule gauche) → risque d’<b>AVC</b>, d’où le traitement anticoagulant.'],
  },
  vg: {
    t: 'Ventricule gauche (VG)', k: 'Cavité · cœur gauche', th: 'coeur',
    d: 'La pompe principale : éjecte le sang riche en O₂ dans l’aorte, vers tout l’organisme.',
    p: [
      '<b>Paroi la plus épaisse</b> du cœur (≈ 10–12 mm) : il doit vaincre la pression artérielle (≈ 120/80 mmHg).',
      'Forme la pointe (apex) du cœur.',
      'Volume d’éjection systolique ≈ 70 mL · fraction d’éjection (FEVG) normale ≥ 50 %.',
    ],
    i: ['<b>Insuffisance cardiaque gauche</b> : le sang reflue vers les poumons → dyspnée, orthopnée, crépitants, jusqu’à l’<b>OAP</b> (œdème aigu du poumon).'],
  },
  tricuspide: {
    t: 'Valve tricuspide', k: 'Valve auriculo-ventriculaire droite', th: 'coeur',
    d: 'Entre l’OD et le VD, formée de 3 valves (cuspides).',
    p: [
      '<b>Ouverte en diastole</b> (le VD se remplit), <b>fermée en systole</b> (empêche le reflux vers l’OD).',
      'Retenue par des <b>cordages tendineux</b> attachés aux piliers (muscles papillaires).',
    ],
    i: ['Sa fermeture, avec celle de la mitrale, produit le <b>1er bruit du cœur, B1</b> (« toum »), au début de la systole.'],
  },
  mitrale: {
    t: 'Valve mitrale', k: 'Valve auriculo-ventriculaire gauche', th: 'coeur',
    d: 'Entre l’OG et le VG, formée de 2 valves : on dit aussi « bicuspide ».',
    p: [
      '<b>Ouverte en diastole</b>, <b>fermée en systole</b>, retenue par cordages et piliers.',
      'C’est la valve AV qui supporte les pressions les plus élevées.',
    ],
    i: ['Fuite (insuffisance mitrale) ou rétrécissement → <b>souffle</b> à l’auscultation (foyer mitral : à la pointe) ; le sang reflue vers l’OG puis les poumons.'],
  },
  pulmonaire: {
    t: 'Valve pulmonaire', k: 'Valve sigmoïde', th: 'coeur',
    d: 'Entre le VD et le tronc pulmonaire : 3 valvules semi-lunaires (« en nid de pigeon »).',
    p: [
      '<b>Ouverte pendant l’éjection</b> du VD, se ferme au début de la diastole.',
      'Pas de cordages : les valvules se remplissent du sang qui reflue et se plaquent l’une contre l’autre.',
    ],
    i: ['La fermeture des valves sigmoïdes (pulmonaire et aortique) produit le <b>2e bruit du cœur, B2</b> (« ta »), au début de la diastole.'],
  },
  aortique: {
    t: 'Valve aortique', k: 'Valve sigmoïde', th: 'coeur',
    d: 'Entre le VG et l’aorte : 3 valvules semi-lunaires.',
    p: [
      '<b>Ouverte pendant l’éjection</b>, fermée en diastole (empêche le sang de l’aorte de revenir dans le VG).',
      'Juste au-dessus : les sinus aortiques, d’où partent les <b>artères coronaires</b>.',
    ],
    i: ['Le <b>rétrécissement aortique</b> (sujet âgé) donne un souffle systolique, des malaises ou syncopes à l’effort, un angor ; il peut être traité par remplacement valvulaire (chirurgie ou TAVI).'],
  },
  septum_iv: {
    t: 'Septum interventriculaire', k: 'Cloison', th: 'coeur',
    d: 'Cloison musculaire épaisse entre VD et VG : le sang du cœur droit et celui du cœur gauche ne se mélangent pas.',
    p: ['Contient le faisceau de His et ses deux branches (conduction électrique).'],
    i: ['La CIV (communication interventriculaire) est une malformation congénitale ; la rupture du septum est une complication rare de l’infarctus.'],
  },
  septum_ia: {
    t: 'Septum interauriculaire', k: 'Cloison', th: 'coeur',
    d: 'Cloison fine entre OD et OG.',
    p: ['Porte la <b>fosse ovale</b>, vestige du foramen ovale : chez le fœtus, ce trou fait passer le sang de l’OD à l’OG (les poumons ne servent pas encore) ; il se ferme à la naissance.'],
    i: ['S’il reste perméable (FOP), un caillot veineux peut passer à gauche : embolie « paradoxale » (AVC).'],
  },
  aorte: {
    t: 'Aorte', k: 'Artère · grande circulation', th: 'coeur',
    d: 'La plus grosse artère du corps (≈ 2,5–3 cm de diamètre) : elle part du VG et distribue le sang riche en O₂ à tout l’organisme.',
    p: [
      'Trajet : aorte ascendante → <b>crosse</b> → aorte thoracique descendante → traverse le diaphragme → <b>aorte abdominale</b> → se divise (vers L4) en 2 artères iliaques communes.',
      'Branches de la crosse : tronc artériel brachio-céphalique (à droite), carotide commune gauche, subclavière gauche.',
      'Paroi élastique : elle amortit l’éjection et entretient le flux pendant la diastole.',
    ],
    i: ['Anévrisme de l’aorte abdominale (masse battante) ; dissection aortique : douleur thoracique brutale « en coup de poignard », asymétrie de tension entre les deux bras.'],
  },
  tabc: {
    t: 'Tronc artériel brachio-céphalique', k: 'Artère · branche de la crosse', th: 'cerveau',
    d: '1re branche de la crosse de l’aorte, à droite. Il n’existe qu’à droite.',
    p: ['Se divise en <b>carotide commune droite</b> (tête) et <b>subclavière droite</b> (bras droit). À gauche, ces deux artères naissent directement de la crosse.'],
  },
  art_pulm: {
    t: 'Tronc et artères pulmonaires', k: 'Artère · petite circulation', th: 'coeur',
    d: 'Le tronc pulmonaire part du VD et se divise en artères pulmonaires droite et gauche, vers chaque poumon.',
    p: [
      '⚠ C’est une <b>artère</b> (elle part du cœur) <b>mais elle transporte du sang pauvre en O₂</b>.',
      'Basse pression (≈ 25/10 mmHg).',
    ],
    i: ['<b>Embolie pulmonaire</b> : un caillot, venu le plus souvent d’une phlébite des jambes (TVP), remonte la VCI, traverse le cœur droit et se bloque dans une artère pulmonaire.'],
  },
  veines_pulm: {
    t: 'Veines pulmonaires', k: 'Veine · petite circulation', th: 'coeur',
    d: '4 veines (2 droites, 2 gauches) qui ramènent le sang des poumons vers l’oreillette gauche.',
    p: ['⚠ Ce sont des <b>veines</b> (elles reviennent au cœur) <b>mais elles transportent du sang riche en O₂</b> : il vient d’être oxygéné dans les poumons (hématose).'],
  },
  vcs: {
    t: 'Veine cave supérieure (VCS)', k: 'Veine · retour au cœur droit', th: 'coeur',
    d: 'Ramène à l’OD le sang pauvre en O₂ de la moitié supérieure du corps : tête, cou, membres supérieurs, thorax.',
    p: [
      'Formée par la réunion des 2 <b>troncs veineux brachio-céphaliques</b> (eux-mêmes = veine jugulaire interne + veine subclavière).',
      'Pas de valvule.',
    ],
    i: ['L’extrémité d’un cathéter veineux central (jugulaire ou subclavier) ou d’une chambre implantable se positionne à la jonction VCS–OD.'],
  },
  vci: {
    t: 'Veine cave inférieure (VCI)', k: 'Veine · retour au cœur droit', th: 'coeur',
    d: 'Ramène à l’OD le sang de la moitié inférieure du corps : membres inférieurs, bassin, reins, foie (par les veines hépatiques).',
    p: [
      'La plus grosse veine du corps ; elle monte à droite de l’aorte et traverse le diaphragme.',
      'Elle reçoit les veines iliaques, rénales et hépatiques, mais <b>pas</b> directement le sang de l’intestin (il passe d’abord par le foie).',
    ],
    i: ['Chez la femme enceinte allongée sur le dos, l’utérus comprime la VCI (syndrome cave) → malaise, hypotension : installer en décubitus latéral gauche.'],
  },
  noeud_sinusal: {
    t: 'Nœud sinusal', k: 'Conduction électrique', th: 'coeur', cond: true,
    d: 'Le pacemaker naturel (nœud de Keith et Flack), dans la paroi de l’OD près de l’arrivée de la VCS.',
    p: [
      'Produit spontanément l’influx : <b>60–100 /min</b> = rythme sinusal.',
      'L’influx dépolarise les oreillettes → <b>onde P</b> de l’ECG.',
      'Accéléré par le sympathique, ralenti par le parasympathique (nerf vague).',
    ],
    i: ['Rythme sinusal à l’ECG : chaque QRS est précédé d’une onde P.'],
  },
  noeud_av: {
    t: 'Nœud auriculo-ventriculaire', k: 'Conduction électrique', th: 'coeur', cond: true,
    d: 'Nœud d’Aschoff-Tawara, à la base du septum interauriculaire : le seul passage électrique normal entre oreillettes et ventricules.',
    p: [
      '<b>Ralentit l’influx</b> (≈ 0,1 s) : les ventricules finissent de se remplir avant de se contracter.',
      'Ce délai correspond à l’<b>espace PR</b> (0,12–0,20 s).',
      'Prend le relais si le nœud sinusal fait défaut : 40–60 /min.',
    ],
    i: ['<b>BAV</b> (bloc auriculo-ventriculaire) : PR allongé, ou ondes P non suivies de QRS ; peut nécessiter un pacemaker.'],
  },
  his: {
    t: 'Faisceau de His et ses branches', k: 'Conduction électrique', th: 'coeur', cond: true,
    d: 'Part du nœud AV, descend dans le septum interventriculaire et se divise en branche droite et branche gauche.',
    p: ['Conduction très rapide vers les deux ventricules.'],
    i: ['Un <b>bloc de branche</b> élargit le QRS (≥ 0,12 s).'],
  },
  purkinje: {
    t: 'Réseau de Purkinje', k: 'Conduction électrique', th: 'coeur', cond: true,
    d: 'Fibres réparties dans les parois des ventricules, de la pointe vers la base.',
    p: [
      'Les ventricules se contractent <b>de la pointe vers la base</b>, comme on presse un tube de dentifrice vers sa sortie.',
      'Dépolarisation des ventricules = <b>complexe QRS</b> (&lt; 0,12 s) ; repolarisation = <b>onde T</b>.',
      'Rythme d’échappement très lent : 20–40 /min.',
    ],
  },
  coro_d: {
    t: 'Artère coronaire droite', k: 'Coronaires', th: 'coronaires',
    d: 'Naît du sinus aortique droit, juste au-dessus de la valve aortique, et chemine dans le sillon entre OD et VD.',
    p: ['Vascularise l’OD, le VD, la face inférieure du VG et, le plus souvent, le nœud sinusal et le nœud AV.'],
    i: ['Un infarctus inférieur (coronaire droite) peut s’accompagner de bradycardie ou de BAV.'],
  },
  coro_g: {
    t: 'Artère coronaire gauche', k: 'Coronaires', th: 'coronaires',
    d: 'Naît du sinus aortique gauche : un tronc commun court qui se divise en IVA et artère circonflexe.',
    p: [
      '<b>Circonflexe</b> : fait le tour du cœur dans le sillon entre OG et VG.',
      'Avec l’IVA, elle vascularise la plus grande partie du VG.',
      'Les coronaires se remplissent <b>pendant la diastole</b> : en systole, le muscle contracté les écrase. Une tachycardie raccourcit la diastole et réduit l’apport en O₂ au cœur.',
    ],
    i: ['<b>Infarctus (IDM)</b> = occlusion d’une coronaire (caillot sur une plaque d’athérome) → douleur thoracique constrictive, irradiant au bras gauche ou à la mâchoire, &gt; 20 min, non calmée par la trinitrine : ECG, troponine, appel du 15.'],
  },
  iva: {
    t: 'Artère interventriculaire antérieure (IVA)', k: 'Coronaires', th: 'coronaires',
    d: 'Branche de la coronaire gauche qui descend dans le sillon interventriculaire antérieur, jusqu’à la pointe.',
    p: ['Vascularise la face antérieure du VG et les 2/3 antérieurs du septum.'],
    i: ['Son occlusion donne l’<b>infarctus antérieur</b>, souvent le plus étendu et le plus grave.'],
  },
  sinus_coro: {
    t: 'Veines du cœur et sinus coronaire', k: 'Coronaires · retour', th: 'coronaires',
    d: 'Le sang pauvre en O₂ du myocarde est recueilli par les veines cardiaques (dont la grande veine du cœur, le long de l’IVA).',
    p: ['Elles se jettent dans le <b>sinus coronaire</b>, sur la face postérieure, qui s’abouche dans l’<b>oreillette droite</b>.'],
  },
  poumons: {
    t: 'Poumons · petite circulation', k: 'Organe · circulation pulmonaire', th: 'poumons',
    d: 'Tout le sang qui sort du cœur droit traverse les poumons (≈ 5 L/min) pour y être oxygéné.',
    p: [
      'Aller : VD → tronc pulmonaire → artères pulmonaires (<b>sang pauvre en O₂</b>) → capillaires autour des alvéoles.',
      '<b>Hématose</b> : à travers la membrane alvéolo-capillaire, le sang capte l’O₂ et rejette le CO₂ (diffusion).',
      'Retour : 4 veines pulmonaires (<b>sang riche en O₂</b>) → OG.',
      'Poumon droit : 3 lobes · poumon gauche : 2 lobes (la place du cœur, l’incisure cardiaque).',
    ],
    i: ['SpO₂ normale : 95–100 %.', 'OAP : le liquide passe des capillaires vers les alvéoles quand la pression monte en amont du cœur gauche.'],
  },
  trachee: {
    t: 'Trachée et bronches', k: 'Voies aériennes', th: 'poumons',
    d: 'L’air (pas le sang !) descend par la trachée, qui se divise au niveau de la carène en deux bronches souches, puis en bronches et bronchioles jusqu’aux alvéoles.',
    p: ['La bronche souche droite est plus verticale et plus large : les corps étrangers inhalés y vont plus souvent.'],
  },
  cerveau: {
    t: 'Cerveau', k: 'Organe', th: 'cerveau',
    d: 'Reçoit ≈ 15 % du débit cardiaque et consomme ≈ 20 % de l’O₂ du corps, sans aucune réserve : quelques minutes sans O₂ suffisent à créer des lésions.',
    p: [
      'Aller : <b>carotides internes</b> (en avant) + <b>artères vertébrales</b> (en arrière, issues des subclavières) → <b>polygone de Willis</b>, une anastomose qui protège l’apport.',
      'Retour : sinus veineux → <b>veines jugulaires internes</b> → troncs veineux brachio-céphaliques → VCS.',
    ],
    i: ['<b>AVC</b> : ischémique (≈ 80 %, artère bouchée, souvent par un caillot venu du cœur ou des carotides) ou hémorragique. Signes FAST (visage, bras, parole) → 15.'],
  },
  carotides: {
    t: 'Artères carotides communes', k: 'Artère · tête et cou', th: 'cerveau',
    d: 'Droite : née du tronc brachio-céphalique · gauche : née directement de la crosse de l’aorte.',
    p: ['Au cou, chacune se divise en carotide <b>interne</b> (cerveau) et <b>externe</b> (face, cuir chevelu).'],
    i: ['<b>Pouls carotidien</b> : à rechercher devant un arrêt cardiaque, d’un seul côté à la fois.'],
  },
  jugulaires: {
    t: 'Veines jugulaires internes', k: 'Veine · tête et cou', th: 'cerveau',
    d: 'Drainent le cerveau, puis rejoignent la veine subclavière pour former le tronc veineux brachio-céphalique → VCS.',
    p: [],
    i: ['<b>Turgescence jugulaire</b> (patient demi-assis) : signe d’insuffisance cardiaque droite.', 'Voie d’abord fréquente des cathéters veineux centraux.'],
  },
  art_bras: {
    t: 'Artères du membre supérieur', k: 'Artère · aller', th: 'bras',
    d: 'Subclavière → axillaire → <b>humérale</b> (ou brachiale) → <b>radiale</b> et ulnaire (cubitale) → arcades de la main.',
    p: ['La subclavière droite naît du tronc brachio-céphalique, la gauche directement de la crosse.'],
    i: ['<b>Pouls radial</b> au poignet ; le brassard à tension comprime l’<b>artère humérale</b> (stéthoscope au pli du coude).', 'Gaz du sang : ponction de l’artère radiale (test d’Allen avant).'],
  },
  veines_bras: {
    t: 'Veines du membre supérieur', k: 'Veine · retour', th: 'bras',
    d: 'Veines profondes (qui doublent les artères) + veines superficielles (céphalique, basilique, médiane du coude) → axillaire → <b>subclavière</b> → tronc veineux brachio-céphalique → VCS.',
    p: [],
    i: ['Prélèvements sanguins et cathéters veineux périphériques : veines du pli du coude et de l’avant-bras : le garrot, posé au-dessus du point de ponction, bloque le retour veineux et fait gonfler les veines.'],
  },
  membres_sup: {
    t: 'Membres supérieurs', k: 'Région', th: 'bras',
    d: 'Le sang y arrive par les subclavières et en repart par les veines profondes et superficielles, vers la VCS.',
    p: ['Clique sur les artères (rouge, lisse) ou les veines (bleu, rayé) pour le détail.'],
  },
  foie: {
    t: 'Foie', k: 'Organe · double apport sanguin', th: 'digestif',
    d: 'Seul organe qui reçoit deux sangs différents.',
    p: [
      '<b>Artère hépatique</b> (≈ 25 %) : sang riche en O₂, branche du tronc cœliaque.',
      '<b>Veine porte</b> (≈ 75 %) : sang pauvre en O₂ mais riche en nutriments, venu de l’intestin.',
      'Le sang traverse les sinusoïdes (épuration, métabolisme, stockage) puis sort par les <b>veines hépatiques</b> (sus-hépatiques) → VCI.',
    ],
    i: ['Cirrhose → <b>hypertension portale</b> → varices œsophagiennes, ascite.', 'Effet de 1er passage hépatique : un médicament pris par la bouche passe d’abord par le foie.'],
  },
  veine_porte: {
    t: 'Veine porte', k: 'Veine · système porte', th: 'digestif',
    d: 'Formée par la réunion des veines mésentériques (intestin) et de la veine splénique (rate, estomac). Elle va au foie, pas au cœur.',
    p: ['<b>Système porte</b> = deux réseaux de capillaires à la suite (intestin, puis foie) : tout ce que l’intestin absorbe passe par le foie avant la circulation générale.'],
  },
  intestin: {
    t: 'Estomac et intestins', k: 'Organes digestifs', th: 'digestif',
    d: 'Aller : aorte abdominale → <b>tronc cœliaque</b> (estomac, foie, rate) et <b>artères mésentériques</b> supérieure et inférieure (intestins).',
    p: ['Retour : veines mésentériques et splénique → <b>veine porte → foie</b>, puis seulement VCI.', 'Le débit digestif augmente après un repas.'],
  },
  art_digest: {
    t: 'Tronc cœliaque et artères mésentériques', k: 'Artère · aller', th: 'digestif',
    d: 'Branches impaires de l’aorte abdominale, destinées au tube digestif.',
    p: ['Tronc cœliaque : artère hépatique (foie), gastrique (estomac), splénique (rate).', 'Mésentérique supérieure : intestin grêle et colon droit · inférieure : colon gauche.'],
  },
  veines_hep: {
    t: 'Veines hépatiques', k: 'Veine · retour', th: 'digestif',
    d: 'Aussi appelées sus-hépatiques : elles ramènent tout le sang sorti du foie dans la VCI, juste sous le diaphragme.',
    p: [],
  },
  reins: {
    t: 'Reins', k: 'Organes', th: 'reins',
    d: 'Reçoivent ≈ 20–25 % du débit cardiaque (≈ 1,2 L/min) pour filtrer le sang : ≈ 180 L de filtrat par jour pour ≈ 1,5 L d’urine.',
    p: [
      'Aller : <b>artères rénales</b>, directement issues de l’aorte abdominale.',
      'Retour : <b>veines rénales</b> → VCI (la gauche, plus longue, passe devant l’aorte).',
      'Ils régulent la pression artérielle (système rénine-angiotensine-aldostérone) et le volume sanguin.',
    ],
    i: ['Hypotension, choc ou déshydratation → les reins sont moins perfusés → insuffisance rénale aiguë fonctionnelle : surveiller la <b>diurèse</b> (≥ 0,5 mL/kg/h).'],
  },
  art_renales: { t: 'Artères rénales', k: 'Artère · aller', th: 'reins', d: 'Branches latérales de l’aorte abdominale, une par rein, qui entrent par le hile.', p: [] },
  veines_renales: { t: 'Veines rénales', k: 'Veine · retour', th: 'reins', d: 'Sortent par le hile et rejoignent la VCI. La veine rénale gauche est plus longue et croise l’aorte par devant.', p: [] },
  ureteres: { t: 'Uretères et vessie', k: 'Voies urinaires', th: 'reins', d: 'L’urine (pas le sang) quitte chaque rein par l’uretère jusqu’à la vessie.', p: [] },
  membres_inf: {
    t: 'Membres inférieurs', k: 'Région', th: 'jambes',
    d: 'Le retour veineux doit remonter contre la pesanteur.',
    p: [
      'Il est aidé par les <b>valvules veineuses</b> (anti-reflux), la <b>pompe musculaire du mollet</b> et la <b>semelle plantaire</b> (de Lejars), écrasée à chaque pas.',
    ],
    i: ['Alitement, plâtre, chirurgie → stase → <b>TVP (phlébite)</b>. Le caillot peut migrer : VCI → OD → VD → artère pulmonaire = <b>embolie pulmonaire</b>. Prévention : lever précoce, contention, anticoagulants.'],
  },
  art_jambes: {
    t: 'Artères du membre inférieur', k: 'Artère · aller', th: 'jambes',
    d: 'Aorte → artères iliaques communes → iliaques externes → <b>fémorales</b> → <b>poplitées</b> (derrière le genou) → tibiales → <b>pédieuse</b> (dos du pied).',
    p: [],
    i: ['Pouls à connaître : fémoral (pli de l’aine), poplité, tibial postérieur (derrière la malléole interne), pédieux.', '<b>AOMI</b> : pouls abolis, pied froid, douleur à la marche.'],
  },
  veines_jambes: {
    t: 'Veines profondes du membre inférieur', k: 'Veine · retour', th: 'jambes',
    d: 'Tibiales → poplitée → <b>fémorale</b> → iliaques → VCI. Elles accompagnent les artères et assurent l’essentiel du retour.',
    p: [],
    i: ['C’est là que se forme la <b>TVP</b> : mollet douloureux, chaud, gonflé, perte du ballant.'],
  },
  saphene: {
    t: 'Grande veine saphène', k: 'Veine superficielle', th: 'jambes',
    d: 'La plus longue veine du corps : de la cheville (devant la malléole interne) jusqu’au pli de l’aine, où elle rejoint la veine fémorale.',
    p: [],
    i: ['Siège des varices ; peut être prélevée pour un pontage coronaire.'],
  },
  pouls: {
    t: 'Prise des pouls', k: 'Repère de soin',
    d: 'On palpe une artère contre un plan dur. Fréquence normale chez l’adulte : 60–100 /min, régulier.',
    p: ['Carotidien (cou) · huméral (pli du coude) · radial (poignet) · fémoral (aine) · poplité (creux du genou) · pédieux (dos du pied).', 'On compte sur 1 minute si le pouls est irrégulier.'],
  },
  rate: {
    t: 'Rate', k: 'Organe', th: 'digestif',
    d: 'Organe lymphoïde situé sous la coupole diaphragmatique gauche, derrière l’estomac.',
    p: ['Irriguée par l’<b>artère splénique</b> (branche du tronc cœliaque) ; la <b>veine splénique</b> rejoint la veine porte.', 'Détruit les globules rouges âgés, participe à l’immunité.'],
    i: ['Organe fragile : risque de rupture lors d’un traumatisme abdominal gauche (hémorragie interne, état de choc).'],
  },
  oesophage: {
    t: 'Œsophage', k: 'Tube digestif', th: 'digestif',
    d: 'Conduit musculaire qui descend derrière la trachée et derrière le cœur (contre l’oreillette gauche), traverse le diaphragme et s’abouche dans l’estomac.',
    p: [],
    i: ['Ses veines basses communiquent avec le système porte : en cas d’hypertension portale, elles se dilatent (varices œsophagiennes, risque d’hémorragie digestive).'],
  },
  gonadiques: {
    t: 'Vaisseaux gonadiques', k: 'Pelvis', th: 'pelvis',
    d: 'Artères testiculaires (homme) ou ovariennes (femme) : elles naissent de l’aorte abdominale, juste sous les artères rénales, car les gonades se forment près des reins chez l’embryon avant de descendre.',
    p: ['Retour : la veine gonadique <b>droite</b> se jette dans la VCI, la <b>gauche</b> dans la veine rénale gauche.'],
    i: ['Chez l’homme, cette asymétrie explique que la <b>varicocèle</b> (dilatation des veines du testicule) soit presque toujours à gauche.'],
  },
  uterus: {
    t: 'Utérus, trompes et ovaires', k: 'Pelvis · femme', th: 'pelvis',
    d: 'L’utérus est situé entre la vessie (en avant) et le rectum (en arrière), basculé vers l’avant (antéversion). Les trompes le relient aux ovaires.',
    p: ['Vascularisation : <b>artères utérines</b> (branches des artères iliaques internes) et <b>artères ovariennes</b> (branches de l’aorte).', 'Pendant la grossesse, le débit utérin augmente énormément (≈ 500 mL/min au terme).'],
    i: ['Hémorragie du post-partum : l’utérus doit se rétracter (« globe de sécurité ») pour comprimer ses vaisseaux.', 'Utérus gravide + décubitus dorsal = compression de la VCI (syndrome cave).'],
  },
  prostate: {
    t: 'Prostate et testicules', k: 'Pelvis · homme', th: 'pelvis',
    d: 'La prostate entoure l’urètre juste sous la vessie ; les testicules sont dans les bourses, hors de l’abdomen.',
    p: ['Testicules : <b>artères testiculaires</b> issues de l’aorte, qui descendent par le canal inguinal (cordon spermatique).', 'Prostate : branches des artères iliaques internes.'],
    i: ['Hypertrophie bénigne de la prostate (sujet âgé) : dysurie, risque de <b>rétention urinaire</b> (globe vésical).'],
  },
  capillaires: {
    t: 'Capillaires', k: 'Lieu des échanges',
    d: 'Vaisseaux microscopiques entre artérioles et veinules, où le sang ralentit.',
    p: ['L’O₂ et les nutriments passent du sang vers les cellules ; le CO₂ et les déchets font le chemin inverse.', 'Le sang en ressort pauvre en O₂… sauf dans les poumons, où c’est l’inverse.'],
  },
};

export const CIRCUIT_STEPS = [
  ['vcs', 'VCS / VCI'], ['od', 'OD'], ['tricuspide', 'Tricuspide'], ['vd', 'VD'], ['pulmonaire', 'Valve pulm.'],
  ['art_pulm', 'Artères pulm.'], ['poumons', 'Poumons'], ['veines_pulm', 'Veines pulm.'], ['og', 'OG'],
  ['mitrale', 'Mitrale'], ['vg', 'VG'], ['aortique', 'Valve aortique'], ['aorte', 'Aorte'], ['capillaires', 'Organes'],
  ['vci', 'Veines caves'],
];

export const REPERES = `
<p class="lead">Les valeurs à connaître pour l’adulte au repos.</p>
<table class="ref">
<tr><th>Fréquence cardiaque</th><td>60–100 bpm (bradycardie &lt; 60, tachycardie &gt; 100)</td></tr>
<tr><th>Pression artérielle</th><td>≈ 120/80 mmHg · HTA ≥ 140/90 · hypotension si PAS &lt; 90</td></tr>
<tr><th>PAM</th><td>(PAS + 2 × PAD) / 3 ≈ 93 mmHg · à maintenir ≥ 65</td></tr>
<tr><th>Volume d’éjection (VES)</th><td>≈ 70 mL par battement</td></tr>
<tr><th>Débit cardiaque</th><td>DC = VES × FC ≈ 5 L/min</td></tr>
<tr><th>Volume sanguin</th><td>≈ 5 L (≈ 70 mL/kg)</td></tr>
<tr><th>FEVG</th><td>normale ≥ 50 %</td></tr>
<tr><th>SpO₂</th><td>95–100 %</td></tr>
<tr><th>ECG</th><td>PR 0,12–0,20 s · QRS &lt; 0,12 s · 1 petit carreau = 0,04 s</td></tr>
<tr><th>Bruits du cœur</th><td>B1 = fermeture des valves AV (début de systole) · B2 = fermeture des sigmoïdes (début de diastole)</td></tr>
</table>
<h3>Systole / diastole</h3>
<ul>
<li><b>Systole ventriculaire</b> : contraction isovolumique (toutes les valves fermées) puis éjection (sigmoïdes ouvertes).</li>
<li><b>Diastole</b> : relaxation isovolumique, remplissage (valves AV ouvertes), puis systole auriculaire qui termine le remplissage.</li>
<li>Au repos, la diastole dure environ 2/3 du cycle : c’est elle qui raccourcit quand le cœur accélère.</li>
</ul>`;

// Quiz : clique sur la bonne structure. a = fiches acceptées, th = thèmes à afficher, cond = conduction visible.
export const QUIZ = [
  { q: 'Clique sur la cavité qui reçoit le sang des veines caves.', a: ['od'], th: [] },
  { q: 'Clique sur la cavité dont la paroi est la plus épaisse.', a: ['vg'], th: [] },
  { q: 'Clique sur la valve entre l’oreillette gauche et le ventricule gauche.', a: ['mitrale'], th: [] },
  { q: 'Clique sur la valve qui empêche le sang de l’aorte de revenir dans le ventricule.', a: ['aortique'], th: [] },
  { q: 'Clique sur le vaisseau qui conduit le sang pauvre en O₂ vers les poumons.', a: ['art_pulm'], th: ['poumons'] },
  { q: 'Clique sur la cavité où arrive le sang qui vient d’être oxygéné dans les poumons.', a: ['og'], th: ['poumons'] },
  { q: 'Clique sur les vaisseaux qui ramènent du sang riche en O₂ alors que ce sont des veines.', a: ['veines_pulm'], th: ['poumons'] },
  { q: 'Clique sur le pacemaker naturel du cœur.', a: ['noeud_sinusal'], th: [], cond: true },
  { q: 'Clique sur la structure qui retarde l’influx entre oreillettes et ventricules (espace PR).', a: ['noeud_av'], th: [], cond: true },
  { q: 'Clique sur la veine qui apporte au foie le sang venu de l’intestin.', a: ['veine_porte'], th: ['digestif'] },
  { q: 'Un caillot part d’une phlébite du mollet : clique sur la grosse veine qu’il remonte pour atteindre le cœur.', a: ['vci'], th: ['jambes'] },
  { q: 'Clique sur l’artère dont l’occlusion provoque l’infarctus antérieur.', a: ['iva'], th: ['coronaires'] },
  { q: 'Clique sur les organes qui reçoivent ≈ 20–25 % du débit cardiaque pour filtrer le sang.', a: ['reins'], th: ['reins'] },
  { q: 'Clique sur la veine qu’on observe pour chercher une turgescence (insuffisance cardiaque droite).', a: ['jugulaires'], th: ['cerveau'] },
  { q: 'Clique sur l’artère du pouls qu’on prend au poignet (ou sur son trajet).', a: ['art_bras'], th: ['bras'] },
  { q: 'Clique sur la valve dont la fermeture participe au 1er bruit (B1) côté droit.', a: ['tricuspide'], th: [] },
  { q: 'Clique sur la veine où se jette la veine gonadique gauche.', a: ['veines_renales'], th: ['reins', 'pelvis'] },
  { q: 'Clique sur l’organe qui reçoit environ 75 % de son sang par la veine porte.', a: ['foie'], th: ['digestif'] },
];
