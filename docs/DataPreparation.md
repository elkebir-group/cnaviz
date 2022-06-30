## Data preparation
CNAViz can be run in *de novo* mode, i.e. starting from an empty clustering, or in refinement mode, i.e. starting with a given initial clustering. Following user-guided refinement using CNAViz, the resulting clustering file can be provided to any method of the user's choice for CNA calling. We provide details on how to provide the CNAViz output clustering to HATCHet for CNA calling.

1 (a). HATCHet to get RDR and BAF values.
1 (b). Run GMMHMM.py to get an initial clustering.
1 (c). Use CNAViz.
1 (d). Perform CNA calling using HATCHet (example .ini file [here](docs/hatchet_post.ini)).

2 (a). HATCHet clustering (example.ini file [here](docs/hatchet_pre.ini)).
2 (b). Use CNAViz to refine the existing clustering.
2 (c). Perform CNA calling using HATCHet (example .ini file [here](docs/hatchet_post.ini)).

3 (a). ASCAT clustering.
3 (b). Use CNAViz to refine the existing clustering.
3 (c). Perform CNA calling using HATCHet (example .ini file [here](docs/hatchet_post.ini)).

