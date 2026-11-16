% hanoi.pl -- Tower of Hanoi logic in Prolog
% hanoi(+N, +From, +To, +Via, -Moves)
% Moves is the list of From-To pairs that moves N rings from From to To.

:- module(hanoi, [hanoi/5, min_moves/2]).

hanoi(0, _, _, _, []) :- !.
hanoi(N, From, To, Via, Moves) :-
    N > 0,
    N1 is N - 1,
    hanoi(N1, From, Via, To, Before),      % clear the way
    hanoi(N1, Via, To, From, After),       % rebuild on top
    append(Before, [From-To|After], Moves).

% fewest possible moves for N rings
min_moves(N, Count) :-
    Count is (1 << N) - 1.
