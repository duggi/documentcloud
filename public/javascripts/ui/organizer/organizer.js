dc.ui.Organizer = Backbone.View.extend({

  id : 'organizer',

  PRIVATE_SEARCHES: [
    'all_documents', 'your_documents', 'your_published_documents', 'org_documents'
  ],

  PUBLIC_SEARCHES: [
    'all_documents', 'annotated_documents', 'published_documents', 'popular_documents'
  ],

  events : {
    'click #new_project'              : 'promptNewProject',
    'click .all_documents'            : 'showAllDocuments',
    'click .your_documents'           : 'showYourDocuments',
    'click .org_documents'            : 'showOrganizationDocuments',
    'click .annotated_documents'      : 'showAnnotatedDocuments',
    'click .published_documents'      : 'showPublishedDocuments',
    'click .popular_documents'        : 'showPopularDocuments',
    'click .your_published_documents' : 'showYourPublishedDocuments',
    'click .account_links .text_link' : 'showAccountDocuments',
    'click .toggle_account_links'     : 'toggleAccountLinks',
    'click .organization.box'         : 'showOtherOrgDocuments'
  },

  constructor : function(options) {
    Backbone.View.call(this, options);
    _.bindAll(this, '_addSubView', '_removeSubView', 'renderAccounts');
    this._bindToSets();
    this.subViews = [];
  },

  render : function() {
    var searches = dc.account ? this.PRIVATE_SEARCHES : this.PUBLIC_SEARCHES;
    $(this.el).append(JST['organizer/sidebar']({searches : searches}));
    this.projectInputEl = this.$('#project_input');
    this.projectList    = this.$('.project_list');
    this.sidebar        = $('#sidebar');
    this.renderAccounts();
    this.renderAll();
    return this;
  },

  renderAll : function() {
    if (dc.account) {
      if (Projects.isEmpty()) this.setMode('no', 'projects');
      Projects.each(this._addSubView);
    } else {
      this.$('.organization_list').html(JST['organizer/organizations']());
    }
  },

  renderAccounts : function() {
    this.$('.account_links').html(JST['organizer/account_links']());
  },

  promptNewProject : function() {
    var me = this;
    dc.ui.Dialog.prompt('Create a New Project', '', function(title, dialog) {
      title = Inflector.trim(title);
      if (!title) {
        dialog.error('Please enter a title.');
        return;
      }
      if (Projects.find(title)) return me._warnAlreadyExists(title);
      var count = _.inject(Documents.selected(), function(memo, doc){ return memo + doc.get('annotation_count'); }, 0);
      Projects.create({
        title             : title,
        annotation_count  : count,
        document_ids      : Documents.selectedIds(),
        owner             : true
      });
      return true;
    }, {mode : 'short_prompt'});
  },

  highlight : function(query) {
    Projects.deselectAll();
    this.$('.organization').removeClass('is_selected');
    if (dc.account) {
      var projectName = dc.app.SearchParser.extractProject(query);
      var project = projectName && Projects.find(projectName);
      if (project) return project.set({selected : true});
    } else {
      var group = dc.app.SearchParser.extractGroup(query);
      var org = group && Organizations.findBySlug(group);
      if (org) {
        this.$('#organization_' + org.id).addClass('is_selected');
      }
    }
  },

  showAllDocuments : function() {
    dc.app.searcher.search('');
  },

  showYourDocuments : function() {
    Accounts.current().openDocuments();
  },

  showAnnotatedDocuments : function() {
    dc.app.searcher.search('filter: annotated');
  },

  showPublishedDocuments : function() {
    dc.app.searcher.search('filter: published');
  },

  showPopularDocuments : function() {
    dc.app.searcher.search('filter: popular');
  },

  showAccountDocuments : function(e) {
    var cid = $(e.target).attr('data-cid');
    Accounts.getByCid(cid).openDocuments();
  },

  showYourPublishedDocuments : function() {
    Accounts.current().openDocuments({published : true});
  },

  showOrganizationDocuments : function() {
    this.setMode('show', 'accounts');
    Accounts.current().openOrganizationDocuments();
  },

  showOtherOrgDocuments : function(e) {
    var el = $(e.currentTarget);
    Organizations.get(el.attr('data-id')).openDocuments();
  },

  toggleAccountLinks : function() {
    var mode = this.modes.accounts == 'show' ? 'hide' : 'show';
    this.setMode(mode, 'accounts');
  },

  // Bind all possible and Project events for rendering.
  _bindToSets : function() {
    Projects.bind('add',     this._addSubView);
    Projects.bind('remove',  this._removeSubView);
    Accounts.bind('all',     this.renderAccounts);
  },

  _warnAlreadyExists : function(title) {
    dc.ui.notifier.show({text : 'A project named "' + title + '" already exists'});
    return false;
  },

  _addSubView : function(model) {
    this.setMode('has', 'projects');
    var view = new dc.ui.Project({model : model}).render();
    this.subViews.push(view);
    var index         = Projects.indexOf(view.model);
    var previous      = Projects.at(index - 1);
    var previousView  = previous && previous.view;
    if (index == 0 || !previous || !previousView) {
      $(this.projectList).prepend(view.el);
    } else {
      $(previousView.el).after(view.el);
    }
    dc.app.scroller.checkLater();
  },

  _removeSubView : function(model) {
    this.subViews = _.without(this.subViews, model.view);
    $(model.view.el).remove();
    dc.app.scroller.checkLater();
  }

});
