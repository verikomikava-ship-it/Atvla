# Rune Tracker - 365 Challenge App

ამ აპლიკაციაა React + TypeScript + Tailwind CSS-ით აგებული მოდერნული 365 ამის ტრეკერი.

## ⚙️ დაკომენტაცია

### დაწყება

```bash
# დამოკიდებულებების ინსტალაცია
npm install

# დეველოპმენტ სერვერის გაშვება
npm run dev

# ბილდი პროდაქშნთვის
npm run build

# ბილდის გადახედვა
npm run preview
```

## 📁 პროექტის სტრუქტურა

```
src/
├── components/        # React კომპონენტები
│   ├── Calendar.tsx
│   ├── DayEditor.tsx
│   ├── DebtsManager.tsx
│   ├── BillsManager.tsx
│   ├── StatsView.tsx
│   ├── Header.tsx
│   └── ToolsMenu.tsx
├── hooks/             # Custom React hooks
│   └── useAppState.ts
├── types/             # TypeScript შიდა
│   └── index.ts
├── utils/             # დამხმელი ფუნქციები
│   ├── storage.ts
│   └── calculations.ts
├── App.tsx            # მთავარი აპლიკაცია
├── App.css            # სტილები
├── main.tsx           # შესასვლელი პუნქტი
└── index.css          # გლობალური სტილები
```

## 🎨 ფუნქციები

✅ **დღის რეჟისტრაცია** - შემოსავალი, გამახარჯი, Rune თვლა
✅ **ვალების მენეჯმენტი** - დამატება, წაშლა, გადახდის თვლა
✅ **ბილების სისტემა** - თვიური ბილები, თვლა
✅ **სტატიკა** - თვიური ანალიტიკა, ჯამური რაოდენობა
✅ **ექსპორტი/იმპორტი** - JSON ბექაპი
✅ **LocalStorage** - ავტომატური მონაცემის ბეჭდი

## 🛠️ ტექნოლოგია

- **React 18** - UI ფრეიმვორკი
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **LocalStorage** - მონაცემების შენახვა

## 📝 ლაიცენსია

MIT
