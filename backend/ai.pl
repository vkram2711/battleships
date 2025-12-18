% ai.pl
% Candidate generator that excludes already attacked cells.
% Usage: candidate_moves(Size, Hits, Misses, Attacked, Moves).
% All coords are 1-based R-C pairs.

:- use_module(library(lists)).

% Entry point: if there are hits -> cluster-based candidates, else checkerboard.
candidate_moves(Size, Hits, Misses, Attacked, Moves) :-
    (   Hits \= [] ->
        findall(Cand, cluster_candidate(Size, Hits, Misses, Attacked, Cand), RawCandLists),
        flatten(RawCandLists, RawCands),
        sort(RawCands, UniqueCands),             % remove duplicates
        exclude(in_list(Attacked), UniqueCands, Filtered1),
        exclude(in_list(Hits), Filtered1, Filtered2),   % also exclude Hits (we only want new targets)
        exclude(in_list(Misses), Filtered2, Filtered3),
        findall(RC, ( member(RC, Filtered3), valid_cell(Size, RC) ), Filtered),
        sort(Filtered, Moves)
    ;   % no hits -> checkerboard hunt, exclude Attacked and Misses
        findall(R-C,
            (between(1,Size,R), between(1,Size,C),
             0 is (R + C) mod 2,
             \+ member(R-C, Attacked),
             \+ member(R-C, Misses)
            ),
            Cand),
        sort(Cand, Moves)
    ).

% cluster_candidate(Size, Hits, Misses, Attacked, CandidatesForThisCluster)
cluster_candidate(Size, Hits, Misses, Attacked, Candidates) :-
    member(Start, Hits),
    cluster_of(Start, Hits, Cluster),
    cluster_candidates(Size, Cluster, Hits, Misses, Attacked, Candidates).

% cluster_of(Start, AllHits, Cluster)
cluster_of(Start, Hits, ClusterSorted) :-
    reachable_nodes([Start], Hits, [], Cluster),
    sort(Cluster, ClusterSorted).

reachable_nodes([], _Hits, Visited, Visited).
reachable_nodes([N|Front], Hits, Visited, Result) :-
    (   member(N, Visited)
    ->  reachable_nodes(Front, Hits, Visited, Result)
    ;   findall(Adj, (member(Adj, Hits), orth_adjacent(N, Adj)), Neighbors),
        append(Front, Neighbors, NewFront),
        reachable_nodes(NewFront, Hits, [N|Visited], Result)
    ).

orth_adjacent(R1-C1, R2-C2) :-
    ( R2 is R1, 1 is abs(C2 - C1) ) ;
    ( C2 is C1, 1 is abs(R2 - R1) ).

% cluster_candidates considers Attacked so it doesn't propose attacked cells
cluster_candidates(Size, Cluster, Hits, Misses, Attacked, Cands) :-
    length(Cluster, L),
    ( L >= 2, same_row(Cluster, Row) ->
        cluster_min_max_cols(Cluster, MinC, MaxC),
        findall(Row-NewC,
            ( (NewC is MinC - 1 ; NewC is MaxC + 1),
              valid_cell(Size, Row, NewC),
              \+ member(Row-NewC, Hits),
              \+ member(Row-NewC, Misses),
              \+ member(Row-NewC, Attacked)
            ),
            Cands0),
        sort(Cands0, Cands)
    ; L >= 2, same_col(Cluster, Col) ->
        cluster_min_max_rows(Cluster, MinR, MaxR),
        findall(NewR-Col,
            ( (NewR is MinR - 1 ; NewR is MaxR + 1),
              valid_cell(Size, NewR, Col),
              \+ member(NewR-Col, Hits),
              \+ member(NewR-Col, Misses),
              \+ member(NewR-Col, Attacked)
            ),
            Cands0),
        sort(Cands0, Cands)
    ; % singleton or non-aligned
        findall(NR-NC,
            ( member(R-C, Cluster),
              neighbour(R,C,NR,NC),
              valid_cell(Size, NR, NC),
              \+ member(NR-NC, Hits),
              \+ member(NR-NC, Misses),
              \+ member(NR-NC, Attacked)
            ),
            Cands0),
        sort(Cands0, Cands)
    ).

same_row([R-C | Rest], R) :-
    forall(member(X-Y, Rest), X = R).

same_col([R-C | Rest], C) :-
    forall(member(X-Y, Rest), Y = C).

cluster_min_max_cols(Cluster, MinC, MaxC) :-
    findall(C, member(_R-C, Cluster), Cs),
    min_list(Cs, MinC), max_list(Cs, MaxC).

cluster_min_max_rows(Cluster, MinR, MaxR) :-
    findall(R, member(R-_C, Cluster), Rs),
    min_list(Rs, MinR), max_list(Rs, MaxR).

neighbour(R,C,NR,NC) :-
    (NR is R-1, NC is C);
    (NR is R+1, NC is C);
    (NR is R,   NC is C-1);
    (NR is R,   NC is C+1).

% valid_cell/3 kept for clarity; valid_cell/2 wrapper below for pair usage
valid_cell(_Size, R, C) :-
    integer(R), integer(C),
    R >= 1, C >= 1.

valid_cell(Size, R-C) :-
    integer(R), integer(C),
    R >= 1, R =< Size,
    C >= 1, C =< Size.

in_list(List, Elem) :-
    member(Elem, List).
