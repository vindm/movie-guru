module.exports = {
	env: {
		browser: true,
		commonjs: true,
		es2021: true,
	},
	extends: 'xo',
	overrides: [
		{
			extends: [
				'xo-typescript',
			],
			files: [
				'*.ts',
				'*.tsx',
			],
		},
	],
	parserOptions: {
		ecmaVersion: 'latest',
	},
	rules: {
	},
};
