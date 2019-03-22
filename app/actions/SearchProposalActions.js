import alt from "alt-instance";
import {Apis} from "zosjs-ws";
import {FetchChain} from "zosjs/es";

class SearchProposalActions {
    getProposal(pid) {
        return dispatch => {
            Apis.instance()
                .db_api()
                .exec("get_objects", [[pid]])
                .then(result => {
                    if (
                        !result ||
                        (Array.isArray(result) && result.length === 0) ||
                        (Array.isArray(result) &&
                            result.length === 1 &&
                            !result[0])
                    ) {
                        // return false;
                        Apis.instance()
                            .history_api()
                            .exec("get_object_history", [pid])
                            .then(his_res => {
                                if (
                                    !his_res ||
                                    (Array.isArray(his_res) &&
                                        his_res.length === 0) ||
                                    (Array.isArray(his_res) &&
                                        his_res.length === 1 &&
                                        !his_res[0])
                                ) {
                                    return false;
                                } else {
                                    dispatch(his_res);
                                }
                            });
                    } else {
                        dispatch(result[0]);
                    }
                })
                .catch(error => {
                    console.log(
                        "Error in SearchProposalActions.getProposal: ",
                        error
                    );
                });
        };
    }

    getAccountByName(accName) {
        return dispatch => {
            FetchChain("getAccount", accName)
                .then(acc => {
                    dispatch(acc);
                })
                .catch(error => {
                    console.log(
                        "Error in SearchProposalActions.getProposal: ",
                        error
                    );
                });
        };
    }
}

const SearchProposalActionsInstance = alt.createActions(SearchProposalActions);

export default SearchProposalActionsInstance;
