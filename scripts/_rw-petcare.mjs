import fs from "fs";

// Human rewrite of pet-care idea CARDS only (title + oneLiner). Breakdown
// (gap/pitch/features/monetization), quotes, stats — untouched.
const RU = {
  "pet-care-1": {
    t: "Ошейник, который орёт громче всего при пропаже",
    o: "Обычные трекеры глохнут в самый нужный момент. Этот при потере врубается на полную — громкий звук, яркий маяк и живая точка на карте.",
  },
  "pet-care-2": {
    t: "Заметит, что питомец заболевает, раньше тебя",
    o: "Берёт пульс, сон и активность с любого ошейника и по-простому предупреждает, если с питомцем что-то не так — пора к ветеринару.",
  },
  "pet-care-3": {
    t: "Вся история болезни питомца — в одном месте",
    o: "Прививки, операции, анализы и рецепты в одном приложении. Сменишь ветеринара или клинику — история останется у тебя, ничего не пропадёт.",
  },
  "pet-care-4": {
    t: "Не даст забыть про таблетки и докупить корм",
    o: "Ведёт уход за всеми питомцами сразу: напоминания о лекарствах не сбоят, а когда корм или наполнитель кончается — само подскажет докупить.",
  },
  "pet-care-5": {
    t: "Передержка, где ты сам выбираешь человека",
    o: "Никаких подмен в последний момент: бронируешь конкретного человека, видишь полную цену до оплаты и доверяешь ему, а не вывеске сервиса.",
  },
  "pet-care-6": {
    t: "Передержка для кошек и экзотики, а не только собак",
    o: "Сервис под кошек, мелких и необычных питомцев — с уходом за теми, кому нужны таблетки или уколы вроде инсулина.",
  },
  "pet-care-7": {
    t: "Пристройство питомца без устаревших объявлений",
    o: "Фильтр «рядом» показывает реально близких; уже пристроенных честно помечают; а твоя заявка точно доходит до приюта.",
  },
};

const EN = {
  "pet-care-1": {
    t: "A tracker that screams loudest when your pet is lost",
    o: "Most trackers go quiet at the worst moment. This one does the opposite — when your pet slips away it blasts a loud beacon and shows where they are right now.",
  },
  "pet-care-2": {
    t: "Spots that your pet is getting sick before you do",
    o: "Takes heart rate, sleep, and activity from any collar and warns you in plain words when something is off — time to see the vet.",
  },
  "pet-care-3": {
    t: "Your pet's whole medical history in one place",
    o: "Vaccines, surgeries, lab results, and prescriptions in one app. Switch vets or clinics and the history stays with you — nothing gets lost.",
  },
  "pet-care-4": {
    t: "Never miss a pill or a food reorder again",
    o: "Tracks care for all your pets at once: medication reminders that do not fail, and a nudge to restock food or litter before it runs out.",
  },
  "pet-care-5": {
    t: "Pet sitting where you pick the actual person",
    o: "No last-minute swaps: you book a specific sitter, see the full price before paying, and trust the person — not the brand.",
  },
  "pet-care-6": {
    t: "Pet sitting for cats and exotics, not just dogs",
    o: "Built around cats, small and unusual pets — including care for those who need pills or shots like insulin.",
  },
  "pet-care-7": {
    t: "Pet adoption without stale listings",
    o: "The nearby filter actually shows who is nearby, already-adopted pets are honestly marked, and your inquiry actually reaches the shelter.",
  },
};

const ideas = JSON.parse(fs.readFileSync("src/data/ideas.json", "utf8"));
let n = 0;
for (const i of ideas) {
  const r = RU[i.slug];
  if (!r) continue;
  i.title = r.t;
  i.oneLiner = r.o;
  if (Array.isArray(i.mechanisms) && i.mechanisms[0]) i.mechanisms[0].title = r.t;
  n++;
}
fs.writeFileSync("src/data/ideas.json", JSON.stringify(ideas, null, 1));

const en = JSON.parse(fs.readFileSync("src/data/ideas-content.en.json", "utf8"));
let m = 0;
for (const [slug, e] of Object.entries(EN)) {
  if (!en[slug]) continue;
  en[slug].title = e.t;
  en[slug].oneLiner = e.o;
  m++;
}
fs.writeFileSync("src/data/ideas-content.en.json", JSON.stringify(en, null, 1));
console.log(`RU patched ${n}, EN patched ${m}`);
