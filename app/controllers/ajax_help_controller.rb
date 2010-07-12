class AjaxHelpController < ApplicationController
  
  PAGES = [:index, :accounts, :notes, :publishing, :searching, :privacy, :uploading, :collaboration, :troubleshooting, :tour]

  layout false

  before_filter :login_required

  def contact_us
    LifecycleMailer.deliver_contact_us(current_account, params[:message])
    json nil
  end

  PAGES.each do |resource|
    class_eval "def #{resource}; markdown(:#{resource}); end"
  end
  
  private
  
  def markdown(resource)
    contents = File.read("#{Rails.root}/app/views/help/#{resource}.markdown")
    links_filename = "#{Rails.root}/app/views/help/#{page}_ajax_links.markdown"
    links = File.exists?(links_filename) ? File.read(links_filename) : ""
    render :text => RDiscount.new(contents+links).to_html, :type => :html
  end

end