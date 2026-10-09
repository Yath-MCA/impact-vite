class CustomTooltip {
    init(params) {
        const eGui = (this.eGui = document.createElement('div'));
        const color = params.color || 'white';
        const data = params.api.getDisplayedRowAtIndex(params.rowIndex).data;

        eGui.classList.add('custom-tooltip');
        //@ts-ignore
        eGui.style['background-color'] = color;
        if (params.colDef.field == 'identifier') {
            let temp_title = (data.titleinfo.doctitle ? data.titleinfo.doctitle : (data.doctitle ? data.doctitle : ''));
            let DOC_TITLE = temp_title ? `<span>Title: </span>${temp_title.length>49?temp_title.slice(0,45)+'...':temp_title}` : '';
            let MAIL_ID = (data.emailto ? (typeof data.emailto == 'string' ? (data.emailto.trim().split('@')[0]) : ("object" == typeof data.emailto && data.emailto.length ? this.Mail_Validate(data.emailto) : null)) : null);
            //console.log(MAIL_ID);
            eGui.innerHTML = `<p><span>${(ROLE_IDS[data.role]?ROLE_IDS[data.role]['name']:'Author_Temp')+(data.corole?'(CO)':'')}: </span>${MAIL_ID}</p><p><span>DOC_ID: </span>${data.docid}</p>${DOC_TITLE}`;
        } else {

        }
    }
    getGui() {
        return this.eGui;
    }
    Mail_Validate(params) {
        //@ts-ignore
        //console.log(params);
        let USER_MAIL = localStorage.getItem('xmleditor:login_username');
        let IS_ADMIN_ = localStorage.getItem('xmleditor:admin') == "superadmin" ? true : false;
        let user = (!IS_ADMIN_ ? (params.includes(USER_MAIL) ? USER_MAIL : (params[0])) : (params[0]));
        return user.split('@')[0]; //.replace(/[^.a-zA-Z]/g, '')
    }
}
class CustomLoadingCellRenderer {
    init(params) {
        this.eGui = document.createElement('div');
        this.eGui.innerHTML = `
          <div class="ag-custom-loading-cell" style="padding-left: 10px; line-height: 25px;">  
              <i class="fas fa-spinner fa-pulse"></i> 
              <span>${params.loadingMessage} </span>
          </div>`;
    }
    getGui() {
        return this.eGui;
    }
}
class ClickableStatusBarComponent {
    init(params) {
        this.params = params;

        this.visible = true;
        this.eGui = document.createElement('div');
        this.eGui.className = 'ag-status-name-value';

        var label = document.createElement('span');
        label.innerText = 'Record limit : ';
        this.eGui.appendChild(label);

        this.eButton = document.createElement('button');

        this.buttonListener = this.onButtonClicked.bind(this);
        this.eButton.addEventListener('click', this.buttonListener);

        this.eGui.appendChild(this.eButton);
    }

    getGui() {
        return this.eGui;
    }

    destroy() {
        this.eButton.removeEventListener('click', this.buttonListener);
    }

    onButtonClicked() {
        alert('Selected Row Count: ' + this.params.api.getSelectedRows().length);
    }

    setVisible(visible) {
        this.visible = visible;
        this.eGui.style.display = this.visible ? 'block' : 'none';
    }

    isVisible() {
        return this.visible;
    }
}
class CustomLoadingOverlay {
    init(params) {
        this.eGui = document.createElement('div');
        this.eGui.innerHTML = '<div class="ag-overlay-loading-center" style="background-color: lightsteelblue;">   <i class="fas fa-hourglass-half"> ' + params.loadingMessage + ' </i></div>';    }

    getGui() {
        return this.eGui;
    }

    refresh(params) {
        return false;
    }
}
class CustomNoRowsOverlay {
    init(params) {
        this.eGui = document.createElement('div');
        this.eGui.innerHTML = `
              <div class="ag-overlay-loading-center" style="background-color: lightcoral;">   
                  <i class="far fa-frown"> ${params.noRowsMessageFunc()} </i>
              </div>
          `;
    }

    getGui() {
        return this.eGui;
    }

    refresh(params) {
        return false;
    }
}