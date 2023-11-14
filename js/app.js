var app = angular.module('abilityScores', []);

//CONTROLLERS
app.controller('mainCtrl', function($scope) {	
	/////////////
	//FUNCTIONS//
	/////////////
	
	//DICE ROLLER
	$scope.roll = function(options={}) {
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
	};
	
	//GET ABILITY MOD
	$scope.ablMod = function(score, rev=false) {
		return (rev) ? (score*2)+11 : Math.floor((score-10)/2);
	};
	
	//GENERATE ONE ABILITY SCORE ARRAY
	$scope.generateArray = function(options={}) {
		//default options
		options.size = options.size || 6;
		options.maxStat = options.maxStat || 18;
		options.minStat = options.minStat || 3;
		
		var array = [];
		for (var i=0; i<options.size; i++) {
			let stat = 0;
			while (stat > options.maxStat || stat < options.minStat) stat = $scope.roll(options);
			array.push(stat);
		}
		return array;
	};
	
	//BALANCE ABILITY SCORE ROW
	$scope.balanceRow = function(row, options={}, lastOnly=false) {
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
			row.forEach(stat => total += $scope.ablMod(stat));
			if (total < 1 || max <= 13) {
				options.valid = false;
				row = $scope.generateArray(options);
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
					newMin = $scope.ablMod($scope.ablMod(min) + (diff * -1), true),
					newMax = $scope.ablMod($scope.ablMod(max) - diff, true);
				if (diff !== 0) {
					options.valid = false;
					if (diff > 0 && newMax >= options.minStat) {
						//lower highest stat
						row[maxI] = newMax;
						//console.log('lower highest stat; newMax: '+newMax);
					} else if (diff < 0 && newMin <= options.maxStat) {
						//raise lowest stat
						var minI = (lastOnly) ? row.length-1 : row.indexOf(min);
						row[minI] = newMin;
						//console.log('raise lowest stat; newMin: '+newMin);
					} else if (!lastOnly) {
						//reroll entire row
						row = $scope.generateArray(options);
						//console.log('reroll the row');
					}
				}
			}
		} while (total < options.totalMin || total > options.totalMax);
		return {valid: options.valid, row: row};
	};
	
	//GENERATE INITIAL MATRIX, CONSTRAIN BY OPTIONAL MIN/MAX
	$scope.generateMatrix = function(options={maxStat: 18, minStat: 3, size: 6, dice: "4d6", drop: 1}) {
		//sanitize options for hard constraints
		if (options.totalMin > options.totalMax) options.totalMin = options.totalMax;
		if (options.totalMax < options.totalMin) options.totalMax = totalMin;
		if (options.maxStat > 18) options.maxStat = 18;
		if (options.minStat < 3) options.minStat = 3;
		if (options.goodStat && options.goodStat > 18) options.goodStat = 18;
		console.log(options);
		let matrix = [];
		for (var i = 0; i<options.size; i++) {
			matrix.push($scope.generateArray(options));
		}
		return $scope.filterMatrix(matrix, options);
	};
	
	//ROTATE MATRIX
	$scope.rotateMatrix = function(matrix) {
		var newMatrix = [];
		for (var x=0; x<matrix.length; x++) {
			for (var y=0; y<matrix[0].length; y++) {
				if (typeof newMatrix[y] === 'undefined' || newMatrix[y].length === 0) newMatrix[y] = [];
				newMatrix[y][x] = matrix[x][y];
			}
		}
		return newMatrix;
	};
	
	//CHECK MATRIX AGAINST MAXIMUM ABILITY MOD TOTAL
	$scope.filterMatrix = function(matrix, options={}) {		
		//default options
		options.maxStat = options.maxStat || 18;
		options.minStat = options.minStat || 3;
		options.goodStat = options.goodStat || false;
		options.dice = options.dice || "4d6";
		options.drop = options.drop || 1;
		options.size = options.size || 6;
		
		options.valid = false;
		let counter = 0;
		while (!options.valid && counter < 10000) {
			options.valid = true;
			
			//ROWS
			matrix.forEach((row, rowNum) => {
				var bRow = $scope.balanceRow(row, options);
				matrix[rowNum] = bRow.row;
				options.valid = bRow.valid;
			});
			
			//COLUMNS
			var columns = $scope.rotateMatrix(matrix);
			matrix.forEach((col, colNum) => {
				var bCol = $scope.balanceRow(col, options);
				columns[colNum] = bCol.row;
				options.valid = bCol.valid;
			});
			matrix = $scope.rotateMatrix(columns);
			
			
			//UNUSED DIAGONAL
			// var diagColTop = $scope.balanceRow(diagTop, options);
			// options.valid = diagColTop.valid;
			// var diagColBot = $scope.balanceRow(diagBottom, options);
			// options.valid = diagColBot.valid;
			// for (i = 0; i < options.size; i++) {
				// matrix[i][i] = diagColTop.row[i];
				// matrix[(options.size - 1) - i][i] = diagColBot.row[i];
			// }
			
			counter++;
			// console.log(counter);
			// console.log(options.valid);
		}
		
		//TOP DIAG		
		var topTotal = 0,
			botTotal = 0,
			redo = false;
		for (i = 0; i < options.size; i++) {
			topTotal += $scope.ablMod(matrix[i][i]);
			botTotal += $scope.ablMod(matrix[(options.size - 1) - i][i]);
		}
		//see if swapping rows can balance it
		console.log('check top diag');
		if ((topTotal > options.totalMax || topTotal < options.totalMin) && (botTotal > options.totalMax || botTotal < options.totalMin)) {
			checkDiag:
			for (x = 0; x < options.size; x++) {
				console.log('topTotal: '+topTotal);
				console.log('botTotal: '+botTotal);
				console.log('x row: '+x);
				let a = matrix[x][x],
					j = matrix[x][(options.size - 1) - x];
				for (y = 0; y < options.size; y++) {
					if (x !== y) {
						console.log('y row: '+y);
						let b = matrix[x][y],
							c = matrix[y][x],
							d = matrix[y][y],
							k = matrix[x][(options.size - 1) - y],
							l = matrix[y][(options.size - 1) - x],
							m = matrix[y][(options.size - 1) - y];
							swap = (topTotal - $scope.ablMod(a) + $scope.ablMod(c) - $scope.ablMod(d) + $scope.ablMod(b));
							swap2 = (botTotal - $scope.ablMod(j) + $scope.ablMod(l) - $scope.ablMod(m) + $scope.ablMod(k));
							if (swap <= options.totalMax && swap >= options.totalMin && swap2 <= options.totalMax && swap2 >= options.totalMin) {
								console.log('found it; swap: '+swap);
								matrix.splice(y, 0, matrix.splice(x, 1)[0]);
								topTotal = swap;
								botTotal = swap2;
								break checkDiag;
							}
					}
				}
				if (x = options.size - 1) redo = true;
			}
		}
				
		//check stat protection
		var diagTop = [],
			diagBottom = [];
			
		for (i = 0; i < options.size; i++) {
			diagTop.push(matrix[i][i]);
			diagBottom.push(matrix[(options.size - 1) - i][i]);
		}
		if (options.goodStat) {
			let highest = Math.max(...diagTop),
				hIndex = diagTop.indexOf(highest),
				atleastDiff = (options.goodStat - highest);
			if (atleastDiff > 1) redo = true;
			else if (atleastDiff == 1 && highest % 2 == 0) {
				console.log('highest: '+highest)
				console.log(diagTop);
				matrix[hIndex][hIndex] = highest + 1;
			}
		}
		
		if (redo) $scope.generateMatrix(options);
		else {
			$scope.sizeArr = [...Array(options.size).keys()];
			$scope.matrix = matrix;
		}
	};
	
	////////
	//VARS//
	////////
	$scope.abilities = [
		{'name': 'Strength',
		 'score': 8},
		{'name': 'Dexterity',
		 'score': 8},
		{'name': 'Constitution',
		 'score': 8},
		{'name': 'Intelligence',
		 'score': 8},
		{'name': 'Wisdom',
		 'score': 8},
		{'name': 'Charisma',
		 'score': 8},
	];
	$scope.options = {
		totalMin: 7,
		totalMax: 7,
		maxStat: 18,
		minStat: 3,
		goodStat: 15,
		dice: "4d6",
		drop: 1,
		size: $scope.abilities.length
	};
	$scope.optionNames = {
		totalMin: 'Minimum Total Modifier',
		totalMax: 'Maximum Total Modifier',
		maxStat: 'Maximum Ability Score',
		minStat: 'Minimum Ability Score',
		goodStat: 'At least 1 stat this high',
		dice: 'Dice rolled',
		drop: 'Drop lowest?',
		size: 'Number of Stats'
	};
	$scope.sizeArr = [];
	
	////////
	//ON-LOAD//
	////////
	$scope.generateMatrix($scope.options);
	console.log($scope.matrix);
	
});