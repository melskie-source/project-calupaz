% server.pl -- serves the frontend and a small JSON API using SWI-Prolog
% Run:  swipl server.pl     then open http://localhost:8080
%
%   GET /api/ping           -> {"status":"ok", ...}
%   GET /api/solve?n=4      -> {"n":4,"count":15,"moves":[{"from":0,"to":1}, ...]}
%
% Towers are numbered 0 (Start), 1 (Spare), 2 (Goal).

:- use_module(library(http/thread_httpd)).
:- use_module(library(http/http_dispatch)).
:- use_module(library(http/http_json)).
:- use_module(library(http/http_parameters)).
:- use_module(library(http/http_files)).
:- use_module(library(http/http_cors)).
:- use_module(library(filesex)).
:- use_module(hanoi).

:- set_setting(http:cors, [*]).

port(8080).

% absolute path of ../frontend, computed when this file is loaded
:- dynamic frontend_dir/1.
:- prolog_load_context(directory, Here),
   directory_file_path(Here, '../frontend', Rel),
   absolute_file_name(Rel, Abs),
   asserta(frontend_dir(Abs)).

:- http_handler(root(api/ping),  ping_handler,   []).
:- http_handler(root(api/solve), solve_handler,  []).
:- http_handler(root(.),         static_handler, [prefix]).

static_handler(Request) :-
    frontend_dir(Dir),
    http_reply_from_files(Dir, [indexes(['index.html'])], Request).

ping_handler(_Request) :-
    cors_enable,
    reply_json_dict(_{status: "ok", engine: "SWI-Prolog"}).

solve_handler(Request) :-
    cors_enable,
    http_parameters(Request, [n(N, [integer, between(1, 10)])]),
    hanoi(N, 0, 2, 1, Moves),
    length(Moves, Count),
    maplist(move_dict, Moves, List),
    reply_json_dict(_{n: N, count: Count, moves: List}).

move_dict(From-To, _{from: From, to: To}).

:- initialization(main, main).

main :-
    port(Port),
    http_server(http_dispatch, [port(Port)]),
    format("Hanoi Bells is running at http://localhost:~w~n", [Port]),
    thread_get_message(_).     % keep the server alive
