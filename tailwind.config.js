/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors:{
        brand:{50:"#f5f8ff",100:"#e9efff",200:"#cddaff",300:"#a9beff",400:"#7f9bff",500:"#5578ff",600:"#3c5ef0",700:"#2e47bf",800:"#253a97",900:"#1f317a"}
      }
    },
  },
  plugins: [],
}
