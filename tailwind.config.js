module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/**/*.html",
        // 如果你的组件在特定目录，确保也包含它
        "./src/components/**/*.{js,jsx,ts,tsx}",
        // 如果你有options页面，确保包含它
        "./src/options/**/*.{js,jsx,ts,tsx,html}",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}