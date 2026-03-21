the core of our business is submissions.
We submit writers and their mateiral to people on projects and try to understand if they love them or hate them. if they love them, we set meetings.  we review submissions, follow up, and discuss settings meetings.
when they meet, we negotiate deals whcih is adding them to projects. Then we set contracts.

Here is what we need in terms of pages in an ever present sidebar:
    Dashboard
    Call Sheet
    Meetings
    Submissions
    Clients
    Client Material
    Contacts
    Companies
    Projects
    Files
    Settings


now, I need you to compeltely unravel this entire app and we're gonna start from scratch becuasse what you built was garbage.

I need the following elements:

Call Sheet - shows who is calling in and who we need to cal out. use the current call log as the base. The filters that exist are good too. I dont need an about field i the call log. Just who called, about what client, statys, priority, the perso's pone number, the date and time they called. Edit the call log as such.

    Individual call page
    An individual call page should show more detail - the current call log detail page is fine. Keep that functionality - but remove about field. We can store that shit i the notes if needed.

Meetings
this age listed now is cool. keep this. It shows the client(s), who they met with, Our team attending, statys, date and time, location

    Individual meeting page:
    Each of these is a picklist:
        - Client name (can select multiple from clients table)
        - who they're meeting wiith (can select multiple from contacts table)
        - Our team (can select multipe from team members table)
        - project(s) can select multiple from projects table
        - status (single select
        date and time
        location - from picklist (Virtual, in-person, hybrid) - if virtual is selected, drop down a Virtual Meeting field with info: url, phone conf, etc), if in-person, drop down meeting address field - whcih takes a regular physical address, if hybrid - drop down both virtual and meeting address fields

        Notes field - open paragraph with rich text field

Submissions
we need to log material going out. I need a running table log of all submissions by status. the filter there now is fine. I need to show the date of the submission first, the status, the clients submitted, the person to whom the submission was made, and a general reason for teh submission.

    Individual Submissions page:
    On individual submission page I need to show the submission status, date, and reason. How it's listed now is fine. keep that.

    But we need to change materials submitted area.
    in this area of the individual submission oage we need to select the following:
        - Client from picklist (single client select)
        - mateiral from picklist that is auto filtered by material linked to that client - single select material field
        - Priject picklist that is auto filtered from projects table. this picklist should allow multiple selctions of projcts
        - Person to whom mateiral is being submitted. This comesfrom contact table. can select single person
        - response - this comes from picklist of responses. only one item can be selected. this will be linked to contacts and clients and material. We want to be able to look at clients later and see which contacts saw their mateiral and what the response was
        Notes on that submission - this is a rich text field


Clients page
list of clents from the clients table -  shwoing info from individual client page for each client. Show name, current project, then current staff level 

    Individual client page:
    Several tabs:
    - info
    - grid
    - meetings
    - submisssions
    - client material
    - calls
    - credits

    Info tab - 
        shows first and last name
        Their company name - lable this Company / Loan Out - this is a picklist from all companies table. Can add new if not there.
        Staff level - this shows their current staff level from whatever prject they are attached to that is listed as status current.

        Contact info area
            can add phone and select type, cell, home, office, etc.
            Emails - like phones - can add and select type
            Addresses - like phones, can add and select type
            Social links - ike phones can add urls and eslect types, instagram, facebook, website, etc

    Grid tab
        Keep this exactly like it is now
        shows met with on leftm nnot yet met with on right

    meetings tab
        Lets make this a table - not cards
        this pylls from the meetings this client are attached to from meetings table
        We know we're on contact individual age, so no need to relist client name here, just show tabe of who they met with - name of that person, date of that meeting, and whether it was related to a project or not- list that project or leave it blank. Have an icon going to that meeting individual page.

    submisssions tab
        this pulls from submissions the client is attached to
        No need to restate the client - just show the names of people to whom the client's material has been submitted to, their current company, and the project that submission was related to and the response from that submission and person that submission was attached to. Icon to link over and view that individual submission.


    client material tab
        Shows title, type, format, genre, sub genre, status from individual client materials paages that are associated with this client

    credits tab
        Credits shows which projects they are attached to
        Project, staff level, status, Start Year, End Year
        Project is a picklist - single selection, 
        staff level - picklist single value 
        Status - single picklist, current or former
        Start Year single 4 digit year
        End Year single 4 digit year

    calls tab
        This is a table showing the info attached to this client from the call sheet table
        show log date and time of call, status, 

Individual client material page
    Title - simple text field
    Client chooser - this should allow multiple client choice becuase sometimes more than one person both write a piece
    - type is a picklist - single choice
    Format is a picklist single choice
    statys picklist single choice
    Genre pick list single chice
    sub genre - pick list multiple choice
    Link to box file

    In the bottom of this page should be a Submissions table, showing where this material has been submitted
    Name of person to whom it was submitted, their current company, buyer type, project, and any response attached to that mateiral from that submission, if any. This pulls from individual submissions table for clients material associated.
    

Contacts page
This lists people from the contacts table
search box on top is great
Filter boxes for buyer, tyoe, level - all good - keep those
Table below good
    name
    company
    title
    type
    phone
    email

    Individual contact page - Clicking on a contact opens their individual contact page with the following tabs:
        Info
        Grid
        Meetings
        Submissions
        Calls

        Info tab:
            this can be exactly like what it is now. First and last name, company selector - single selector, title picklist
            type, level, and buyer type - all three of those picklists

            Phones, email, address, social links - all areas with + Add buttons with picklists for types - just like we did on clients individual page

            Assistant should be its own section too
            + assistant allows selecting from contacts list - single select.
            in the assistant area when assistant is chosen it will show that person's starred phone an email
            
            Notes field - rich text box

        Grid tab
            This shows this personn's info on top like the other grids we've done
            then below that clients they've met on the left
            ont he right, clients they've not yet met
       
        Meetings tab
            This pulls from meetings the contact is attached to. 
            Table of clients they've met with along with date of meeting and any projects that might have been attached to that meeting. Have an icon going to that meeting individual page.

        submisssions tab
            this pulls from submissions the contact is attached to
            just show the names of client whom they were submitted materia, the name of the mateiral submitted to that contact, their current company, and the project that submission was related to and the response from that person to that client material. Icon to link over and view that individual submission.
        
        calls tab
            This is a table showing the info attached to this contact from the call sheet table
            show log date and time of call, status, and if that call was about a specific client

Companies page
    List of companies from the companies table - just like it is now:
        name
        types
        outlet
    
    Individual Company page:
    A few tabs:
        Info
        people
        projects

    Info tab:
        Just like it is now, showing:
            - Company Name - simple text field
            Types, outlet, departments - all pick lists
            Sections for phones, emails, addresses, scoial links - just like on client and contact pages

    People tab
        This is a table of the people associated with that company shwoing:
        Name, Title, level, department, buyer type, phone, email from starred phone andemail fiels from the individual contact page, any projects they're associated with

    Projects tab
        A table showing the projects that company is associated with - pulls from info on indibidual projects page

        Project name
        Project type
        Project status
        Project Genre
        Project Subgenre

        Icon to visit individual project page

Projects page
This is a table showing the projects from the projects table
Name, status, associated companies

Associated companies are comma separated list from the companies selected on individual project pages. They are cliclable and open that individual company page

    Individual Project Page
    has several tabs:
        Info
        People
        Meetings
        Submissions
        Clients

        Info tab
            This shows name of project - simple text field
            Status - picklist
            Companies section - this allwos adding new company which is a single picklist option with type which is from picklist

        People tab
            This is a table of the people associated with that project shwoing:
            Name, Title, level, department, buyer type, phone, email from starred phone and email fiels from the individual contact page
    
        Meetings tab
            This pulls from meetings the project is attached to. 
            Table of clients they've met with along with people they met with, date of meeting. Have an icon going to that meeting individual page.
        
        submisssions tab
            this pulls from submissions the project is attached to
            just show the names of client who was submitted related to that project from the individual submission
            The name of the mateiral submitted to that project
            The person/contact who received that submission and their response, if any
            Icon to link over and view that individual submission.
        

Files page - leave this as is right now - box integration

Settings page
leave this as is now - but create any picklists and associated tables if we're missing any right now from what i've described here.
