//DICE ROLLER
function roll(options={}) {
	//default options
	options.dice = options.dice || "d6";
	options.drop = options.drop || false;
	
	var dice = options.dice.split("d");
	let num = dice[0] || 1,
		sides = dice[1],
		results = [],
		total = 0;	
	while (num > 0) {
		results.push(Math.floor(Math.random() * sides) + 1);
		num--;
	}
	if (options.drop) {
		var drop = options.drop;
		results.sort((a, b) => a - b);
		while (drop > 0) {
			results.shift();
			drop--;
		}
	}
	total = results.reduce((partial, a) => partial+a, 0);
	return total;
}

//GENERATE ONE ABILITY SCORE ARRAY
function generateArray(options={}) {
	//default options
	options.size = options.size || 6;
	options.maxStat = options.maxStat || 18;
	options.minStat = options.minStat || 3;
	
	var array = [];
	for (var i=0; i<options.size; i++) {
		let stat = 0;
		while (stat > options.maxStat || stat < options.minStat) stat = roll(options);
		array.push(stat);
	}
	return array;
}

//GENERATE INITIAL MATRIX, CONSTRAIN BY OPTIONAL MIN/MAX
function generateMatrix(options={maxStat: 18, minStat: 3, size: 6, dice: "4d6", drop: 1}) {
	let matrix = [];
	for (var i = 0; i<options.size; i++) {
		matrix.push(generateArray(options));
	}
	return matrix;
}

//GET ABILITY MOD
function ablMod(score, rev=false) {
	return (rev) ? (score*2)+11 : Math.floor((score-10)/2);
}

//BALANCE ABILITY SCORE ROW
function balanceRow(row, options={}, lastOnly=false) {
	//default options
	options.maxStat = options.maxStat || 18;
	options.minStat = options.minStat || 3;
	options.goodStat = options.goodStat || false;
	options.dice = options.dice || "4d6";
	options.drop = options.drop || 1;
	options.totalMin = options.totalMin || 1;
	options.totalMax = options.totalMax || 24;
	
	var total = 0;
	
	do {
		//re-roll if total is less than 1 or highest score is 13 or less
		let max = Math.max(...row),
			maxI = row.indexOf(max);
		total = 0;
		row.forEach(stat => total += ablMod(stat));
		if (total < 1 || max <= 13) {
			options.valid = false;
			row = generateArray(options);
		}
		else {
			if (lastOnly) {
				max = row[row.length-1];
				maxI = row.length-1;
			}
			//optional high stat protection
			if (options.goodStat && Math.max(...row) < options.goodStat) row[maxI] = options.goodStat;
			let diff = (total > options.totalMax) ? total - options.totalMax : ((total < options.totalMin) ? total - options.totalMin : 0),
				min = (lastOnly) ? row[row.length-1] : Math.min(...row),
				newMin = ablMod(ablMod(min) + (diff * -1), true),
				newMax = ablMod(ablMod(max) - diff, true);
			if (diff !== 0) {
				options.valid = false;
				if (diff > 0 && newMax >= options.minStat) {
					//lower highest stat
					row[maxI] = newMax;
					console.log('lower highest stat; newMax: '+newMax);
				} else if (diff < 0 && newMin <= options.maxStat) {
					//raise lowest stat
					var minI = (lastOnly) ? row.length-1 : row.indexOf(min);
					row[minI] = newMin;
					console.log('raise lowest stat; newMin: '+newMin);
				} else if (!lastOnly) {
					//reroll entire row
					row = generateArray(options);
					console.log('reroll the row');
				}
			}
		}
	} while (total < options.totalMin || total > options.totalMax);
	return {valid: options.valid, row: row};
}

//ROTATE MATRIX
function rotateMatrix(matrix) {
	var newMatrix = [];
	for (var x=0; x<matrix.length; x++) {
		for (var y=0; y<matrix[0].length; y++) {
			if (typeof newMatrix[y] === 'undefined' || newMatrix[y].length === 0) newMatrix[y] = [];
			newMatrix[y][x] = matrix[x][y];
		}
	}
	return newMatrix;
}

//CHECK MATRIX AGAINST MAXIMUM ABILITY MOD TOTAL
function filterMatrix(matrix, options={}) {
	//default options
	options.maxStat = options.maxStat || 18;
	options.minStat = options.minStat || 3;
	options.goodStat = options.goodStat || false;
	options.dice = options.dice || "4d6";
	options.drop = options.drop || 1;
	
	options.valid = false;
	let counter = 0;
	while (!options.valid && counter < 10000) {
		options.valid = true;
		
		//ROWS
		matrix.forEach((row, rowNum) => {
			var bRow = balanceRow(row, options);
			matrix[rowNum] = bRow.row;
			options.valid = bRow.valid;
		});
		
		//COLUMNS
		var columns = rotateMatrix(matrix);
		matrix.forEach((col, colNum) => {
			var bCol = balanceRow(col, options);
			columns[colNum] = bCol.row;
			options.valid = bCol.valid;
		});
		matrix = rotateMatrix(columns);
		counter++;
		console.log(counter);
		console.log(options.valid);
	}
	return matrix;
	
}