export const recoverDbPayload = (docId) => {
    return {
        tbl: 'Fileslist',
        asyn: '1',
        find: {
            status: 'active',
            docid: docId,
            projecttitle: {
                $exists: true
            }
        },
        length: 1,
        sort: {},
        filter: ['projecttitle', 'id', 'status', 'dtd', 'client', 'type', 'projectname']
    };
};